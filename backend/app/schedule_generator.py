from typing import List, Dict, Optional, Tuple
from app.models import Institution, ClassGroup, Subject, Teacher, Classroom, ScheduleSlot
from app.schemas import ScheduleSlot as ScheduleSlotSchema
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class LessonRequirement:
    def __init__(self, id: str, group_id: str, group_name: str, subject_id: str, 
                 subject_name: str, subject_type: str, available_teacher_ids: List[str], priority: int):
        self.id = id
        self.group_id = group_id
        self.group_name = group_name
        self.subject_id = subject_id
        self.subject_name = subject_name
        self.subject_type = subject_type
        self.available_teacher_ids = available_teacher_ids
        self.priority = priority

class ScheduleGenerator:
    def __init__(self, institution: Institution, class_groups: List[ClassGroup], 
                 subjects: List[Subject], teachers: List[Teacher], classrooms: List[Classroom]):
        self.institution = institution
        self.class_groups = class_groups
        self.subjects = subjects
        self.teachers = teachers
        self.classrooms = classrooms
        self.schedule: List[ScheduleSlotSchema] = []
        self.logs: List[str] = []

    def log(self, message: str):
        """Add log message"""
        self.logs.append(message)
        logger.info(message)

    async def generate_schedule(self) -> Dict:
        """Generate complete schedule"""
        try:
            self.log('🚀 Starting smart schedule generation...')
            
            # Reset state
            self.schedule = []
            self.logs = []

            # Validate input data
            validation = self._validate_input_data()
            if not validation['valid']:
                return {'success': False, 'schedule': [], 'error': validation['error'], 'logs': self.logs}

            self.log('✅ Input validation passed')

            # Log classroom specializations and teacher labs
            self._log_classroom_info()

            # Generate lesson requirements
            lesson_requirements = self._generate_lesson_requirements()
            self.log(f'📋 Generated {len(lesson_requirements)} lesson requirements')

            # Sort requirements by priority
            sorted_requirements = self._prioritize_requirements(lesson_requirements)
            self.log('🔄 Prioritized lesson requirements')

            # Attempt to schedule each lesson
            scheduled_count = 0
            failed_count = 0

            for requirement in sorted_requirements:
                success = await self._schedule_lesson(requirement)
                if success:
                    scheduled_count += 1
                else:
                    failed_count += 1
                    # Enhanced failure analysis
                    self._analyze_scheduling_failure(requirement)

            self.log(f'✅ Scheduling complete: {scheduled_count} scheduled, {failed_count} failed')

            if scheduled_count == 0:
                return {
                    'success': False,
                    'schedule': [],
                    'error': 'No lessons could be scheduled. Check teacher availability and classroom assignments.',
                    'logs': self.logs
                }

            # Optimize schedule distribution
            self._optimize_schedule_distribution()

            return {
                'success': True,
                'schedule': [slot.__dict__ for slot in self.schedule],
                'logs': self.logs
            }

        except Exception as error:
            self.log(f'💥 Generation error: {str(error)}')
            return {
                'success': False,
                'schedule': [],
                'error': str(error),
                'logs': self.logs
            }

    def _validate_input_data(self) -> Dict:
        """Validate input data"""
        if len(self.class_groups) == 0:
            return {'valid': False, 'error': 'No class groups configured'}

        if len(self.subjects) == 0:
            return {'valid': False, 'error': 'No subjects configured'}

        if len(self.teachers) == 0:
            return {'valid': False, 'error': 'No teachers configured'}

        if len(self.classrooms) == 0:
            return {'valid': False, 'error': 'No classrooms configured'}

        # Check if groups have assigned subjects
        groups_with_subjects = [group for group in self.class_groups 
                               if group.subject_hours and len(group.subject_hours) > 0]
        if len(groups_with_subjects) == 0:
            return {'valid': False, 'error': 'No subjects assigned to any groups'}

        # Check if subjects have assigned teachers
        subjects_with_teachers = [subject for subject in self.subjects 
                                 if subject.teacher_ids and len(subject.teacher_ids) > 0]
        if len(subjects_with_teachers) == 0:
            return {'valid': False, 'error': 'No teachers assigned to any subjects'}

        return {'valid': True}

    def _log_classroom_info(self):
        """Log classroom information"""
        # Log specialized laboratories
        specialized_labs = [c for c in self.classrooms 
                           if c.type == 'lab' and c.specialization]
        if specialized_labs:
            self.log('🏫 Specialized laboratories detected:')
            for lab in specialized_labs:
                subjects = lab.specialization.split(', ') if lab.specialization else []
                subject_names = []
                for subject_id in subjects:
                    subject = next((s for s in self.subjects if s.id == subject_id), None)
                    subject_names.append(subject.name if subject else subject_id)
                self.log(f'   📍 Room {lab.number}: {", ".join(subject_names)}')

        # Log teacher labs
        teacher_labs = [c for c in self.classrooms if c.type == 'teacher_lab']
        if teacher_labs:
            self.log('👨‍🏫 Teacher labs detected:')
            for lab in teacher_labs:
                owner = next((t for t in self.teachers if t.home_classroom == lab.id), None)
                if owner:
                    self.log(f'   🏠 Room {lab.number}: Owned by {owner.first_name} {owner.last_name}')
                else:
                    self.log(f'   🏠 Room {lab.number}: No assigned owner (available for any teacher)')

    def _generate_lesson_requirements(self) -> List[LessonRequirement]:
        """Generate lesson requirements"""
        requirements = []

        for group in self.class_groups:
            if not group.subject_hours:
                continue
                
            for subject_id, yearly_hours in group.subject_hours.items():
                if yearly_hours > 0:
                    subject = next((s for s in self.subjects if s.id == subject_id), None)
                    if subject and subject.teacher_ids:
                        # Calculate weekly hours
                        weekly_hours = max(1, yearly_hours // self.institution.academic_weeks)
                        
                        # Create requirements for each weekly lesson
                        for i in range(weekly_hours):
                            requirements.append(LessonRequirement(
                                id=f'{group.id}-{subject_id}-{i}',
                                group_id=group.id,
                                group_name=group.name,
                                subject_id=subject.id,
                                subject_name=subject.name,
                                subject_type=subject.type,
                                available_teacher_ids=subject.teacher_ids,
                                priority=self._calculate_priority(subject, group)
                            ))

        return requirements

    def _calculate_priority(self, subject: Subject, group: ClassGroup) -> int:
        """Calculate priority for lesson requirement"""
        priority = 0

        # Lab subjects get higher priority
        if subject.type == 'lab':
            priority -= 10

        # Subjects with specialized classrooms get even higher priority
        has_specialized_classroom = any(
            c.type == 'lab' and c.specialization and subject.id in c.specialization.split(', ')
            for c in self.classrooms
        )
        if has_specialized_classroom:
            priority -= 20

        # Fewer available teachers = higher priority
        priority += len(subject.teacher_ids)

        # Larger groups get slightly higher priority
        priority -= group.students_count // 10

        return priority

    def _prioritize_requirements(self, requirements: List[LessonRequirement]) -> List[LessonRequirement]:
        """Sort requirements by priority"""
        return sorted(requirements, key=lambda x: x.priority)

    async def _schedule_lesson(self, requirement: LessonRequirement) -> bool:
        """Schedule a single lesson"""
        available_slots = self._find_available_slots(requirement)
        
        if not available_slots:
            self.log(f'⚠️ No available slots for {requirement.subject_name} - {requirement.group_name}')
            return False

        # Try to find the best slot
        best_slot = self._select_best_slot(available_slots, requirement)
        
        if best_slot:
            self.schedule.append(best_slot)
            classroom = next((c for c in self.classrooms if c.id == best_slot.classroom_id), None)
            teacher = next((t for t in self.teachers if t.id == best_slot.teacher_id), None)
            
            room_info = f'room {classroom.number}' if classroom else 'unknown room'
            if classroom and classroom.type == 'teacher_lab':
                owner = next((t for t in self.teachers if t.home_classroom == classroom.id), None)
                if owner:
                    room_info += f' ({owner.first_name} {owner.last_name}\'s lab)'
            
            teacher_name = f'{teacher.first_name} {teacher.last_name}' if teacher else 'unknown teacher'
            
            self.log(f'✅ Scheduled {requirement.subject_name} for {requirement.group_name} on {best_slot.day} lesson {best_slot.lesson_number} in {room_info} with {teacher_name}')
            return True

        return False

    def _analyze_scheduling_failure(self, requirement: LessonRequirement):
        """Enhanced analysis of why a lesson couldn't be scheduled"""
        self.log(f'❌ Failed to schedule: {requirement.subject_name} for {requirement.group_name}')
        
        # 1. Check if teachers are assigned to this subject
        if not requirement.available_teacher_ids:
            self.log(f'   🚫 CRITICAL: No teachers assigned to subject "{requirement.subject_name}"')
            return
        
        # 2. Check if assigned teachers exist in the system
        existing_teachers = []
        for teacher_id in requirement.available_teacher_ids:
            teacher = next((t for t in self.teachers if t.id == teacher_id), None)
            if teacher:
                existing_teachers.append(teacher)
            else:
                self.log(f'   ⚠️ WARNING: Teacher ID {teacher_id} assigned to subject but not found in system')
        
        if not existing_teachers:
            self.log(f'   🚫 CRITICAL: None of the assigned teachers exist in the system')
            return
        
        # 3. Check teacher availability
        teachers_with_availability = []
        for teacher in existing_teachers:
            total_available_hours = sum(len(hours) for hours in teacher.available_hours.values())
            if total_available_hours > 0:
                teachers_with_availability.append(teacher)
            else:
                self.log(f'   ⚠️ Teacher {teacher.first_name} {teacher.last_name} has no available hours set')
        
        if not teachers_with_availability:
            self.log(f'   🚫 CRITICAL: None of the assigned teachers have any available hours')
            return
        
        # 4. Check classroom availability for this subject type
        suitable_classrooms = self._get_suitable_classrooms_for_subject_type(requirement.subject_type, requirement.subject_id)
        if not suitable_classrooms:
            if requirement.subject_type == 'lab':
                specialized_labs = self._get_specialized_classrooms_for_subject(requirement.subject_id)
                if specialized_labs:
                    self.log(f'   🚫 CRITICAL: Subject requires specialized lab but all {len(specialized_labs)} specialized labs are unavailable')
                    for lab in specialized_labs:
                        occupied_slots = [s for s in self.schedule if s.classroom_id == lab.id]
                        self.log(f'      📍 Lab {lab.number}: {len(occupied_slots)} slots occupied')
                else:
                    general_labs = [c for c in self.classrooms if c.type == 'lab' and not c.specialization]
                    if not general_labs:
                        self.log(f'   🚫 CRITICAL: No laboratory classrooms available in the system')
                    else:
                        self.log(f'   🚫 CRITICAL: All {len(general_labs)} general laboratory classrooms are unavailable')
            else:
                theory_classrooms = [c for c in self.classrooms if c.type in ['theory', 'teacher_lab']]
                if not theory_classrooms:
                    self.log(f'   🚫 CRITICAL: No theory classrooms available in the system')
                else:
                    self.log(f'   🚫 CRITICAL: All {len(theory_classrooms)} theory classrooms are unavailable')
            return
        
        # 5. Check for time slot conflicts
        self._analyze_time_slot_conflicts(requirement, teachers_with_availability, suitable_classrooms)

    def _get_suitable_classrooms_for_subject_type(self, subject_type: str, subject_id: str) -> List[Classroom]:
        """Get all classrooms suitable for this subject type"""
        if subject_type == 'lab':
            # Check for specialized classrooms first
            specialized = self._get_specialized_classrooms_for_subject(subject_id)
            if specialized:
                return specialized
            # Fall back to general labs
            return [c for c in self.classrooms if c.type == 'lab' and not c.specialization]
        else:
            # Theory subjects can use theory classrooms and teacher labs
            return [c for c in self.classrooms if c.type in ['theory', 'teacher_lab']]

    def _analyze_time_slot_conflicts(self, requirement: LessonRequirement, available_teachers: List[Teacher], suitable_classrooms: List[Classroom]):
        """Analyze specific time slot conflicts"""
        self.log(f'   🔍 Analyzing time conflicts for {len(available_teachers)} teachers and {len(suitable_classrooms)} classrooms')
        
        # Check each day and lesson combination
        conflict_summary = {
            'teacher_conflicts': 0,
            'classroom_conflicts': 0,
            'group_conflicts': 0,
            'teacher_unavailable': 0,
            'total_slots_checked': 0
        }
        
        for day in self.institution.working_days:
            for lesson_number in range(1, self.institution.lessons_per_day + 1):
                conflict_summary['total_slots_checked'] += 1
                
                # Check if group is already scheduled at this time
                group_busy = any(s.class_group_id == requirement.group_id and s.day == day and s.lesson_number == lesson_number for s in self.schedule)
                if group_busy:
                    conflict_summary['group_conflicts'] += 1
                    continue
                
                # Check teacher availability
                available_teachers_for_slot = []
                for teacher in available_teachers:
                    if day in teacher.available_hours and lesson_number in teacher.available_hours[day]:
                        # Check if teacher is already scheduled
                        teacher_busy = any(s.teacher_id == teacher.id and s.day == day and s.lesson_number == lesson_number for s in self.schedule)
                        if not teacher_busy:
                            available_teachers_for_slot.append(teacher)
                        else:
                            conflict_summary['teacher_conflicts'] += 1
                    else:
                        conflict_summary['teacher_unavailable'] += 1
                
                if not available_teachers_for_slot:
                    continue
                
                # Check classroom availability
                available_classrooms_for_slot = []
                for classroom in suitable_classrooms:
                    classroom_busy = any(s.classroom_id == classroom.id and s.day == day and s.lesson_number == lesson_number for s in self.schedule)
                    if not classroom_busy:
                        # Check teacher lab ownership
                        if classroom.type == 'teacher_lab':
                            owner = next((t for t in self.teachers if t.home_classroom == classroom.id), None)
                            if owner and owner not in available_teachers_for_slot:
                                continue  # Can't use this teacher lab
                        available_classrooms_for_slot.append(classroom)
                    else:
                        conflict_summary['classroom_conflicts'] += 1
                
                if available_classrooms_for_slot:
                    # We found at least one valid combination, so the issue might be more complex
                    self.log(f'   ✅ Found potential slot: {day} lesson {lesson_number} with {len(available_teachers_for_slot)} teachers and {len(available_classrooms_for_slot)} classrooms')
                    return
        
        # If we get here, no valid slots were found
        self.log(f'   📊 Conflict analysis results:')
        self.log(f'      • Total time slots checked: {conflict_summary["total_slots_checked"]}')
        self.log(f'      • Group already scheduled: {conflict_summary["group_conflicts"]} slots')
        self.log(f'      • Teachers already scheduled: {conflict_summary["teacher_conflicts"]} conflicts')
        self.log(f'      • Teachers not available: {conflict_summary["teacher_unavailable"]} conflicts')
        self.log(f'      • Classrooms already scheduled: {conflict_summary["classroom_conflicts"]} conflicts')
        
        # Provide specific recommendations
        if conflict_summary['teacher_unavailable'] > conflict_summary['teacher_conflicts']:
            self.log(f'   💡 RECOMMENDATION: Increase teacher availability hours for this subject')
        elif conflict_summary['classroom_conflicts'] > conflict_summary['teacher_conflicts']:
            self.log(f'   💡 RECOMMENDATION: Add more {requirement.subject_type} classrooms or reduce classroom usage')
        elif conflict_summary['group_conflicts'] > 0:
            self.log(f'   💡 RECOMMENDATION: The group schedule is too dense, consider reducing total lessons')
        else:
            self.log(f'   💡 RECOMMENDATION: Complex scheduling conflict - try adjusting teacher hours or adding resources')

    def _find_available_slots(self, requirement: LessonRequirement) -> List[ScheduleSlotSchema]:
        """Find available time slots for a lesson"""
        available_slots = []

        for day in self.institution.working_days:
            for lesson_number in range(1, self.institution.lessons_per_day + 1):
                # Try each available teacher
                for teacher_id in requirement.available_teacher_ids:
                    teacher = next((t for t in self.teachers if t.id == teacher_id), None)
                    if not teacher:
                        continue

                    # Check if teacher is available at this time
                    if day not in teacher.available_hours or lesson_number not in teacher.available_hours[day]:
                        continue

                    # Get suitable classrooms for this teacher and subject
                    suitable_classrooms = self._get_suitable_classrooms_for_teacher(
                        requirement.subject_type, requirement.subject_id, teacher_id
                    )

                    # Try each suitable classroom
                    for classroom in suitable_classrooms:
                        # Check all conflicts
                        if self._is_slot_available(requirement.group_id, teacher_id, classroom.id, day, lesson_number):
                            start_time, end_time = self._calculate_lesson_time(lesson_number)
                            
                            available_slots.append(ScheduleSlotSchema(
                                id=f'{datetime.now().timestamp()}-{len(available_slots)}',
                                day=day,
                                lesson_number=lesson_number,
                                class_group_id=requirement.group_id,
                                subject_id=requirement.subject_id,
                                teacher_id=teacher_id,
                                classroom_id=classroom.id,
                                start_time=start_time,
                                end_time=end_time,
                                created_at=datetime.now()
                            ))

        return available_slots

    def _get_suitable_classrooms_for_teacher(self, subject_type: str, subject_id: str, teacher_id: str) -> List[Classroom]:
        """Get suitable classrooms for teacher and subject"""
        if subject_type == 'lab':
            # First, check for specialized classrooms for this specific subject
            specialized_classrooms = self._get_specialized_classrooms_for_subject(subject_id)
            
            if specialized_classrooms:
                # If there are specialized classrooms for this subject, use ONLY those
                return specialized_classrooms
            
            # If no specialized classrooms, use general lab classrooms
            return [c for c in self.classrooms 
                   if c.type == 'lab' and (not c.specialization or c.specialization.strip() == '')]
        else:
            # For theory subjects
            available_classrooms = []
            
            # 1. Teacher's own lab (if they have one) - HIGHEST PRIORITY
            teacher = next((t for t in self.teachers if t.id == teacher_id), None)
            if teacher and teacher.home_classroom:
                teacher_lab = next((c for c in self.classrooms if c.id == teacher.home_classroom), None)
                if teacher_lab and teacher_lab.type == 'teacher_lab':
                    available_classrooms.append(teacher_lab)
            
            # 2. General theory classrooms
            theory_classrooms = [c for c in self.classrooms if c.type == 'theory']
            available_classrooms.extend(theory_classrooms)
            
            # 3. Unassigned teacher labs
            unassigned_teacher_labs = [
                c for c in self.classrooms 
                if c.type == 'teacher_lab' and not any(t.home_classroom == c.id for t in self.teachers)
            ]
            available_classrooms.extend(unassigned_teacher_labs)
            
            return available_classrooms

    def _get_specialized_classrooms_for_subject(self, subject_id: str) -> List[Classroom]:
        """Get specialized classrooms for a specific subject"""
        return [
            classroom for classroom in self.classrooms
            if classroom.type == 'lab' and classroom.specialization 
            and subject_id in classroom.specialization.split(', ')
        ]

    def _is_slot_available(self, group_id: str, teacher_id: str, classroom_id: str, day: str, lesson_number: int) -> bool:
        """Check if a time slot is available"""
        # Check for any conflicts in the current schedule
        has_conflict = any(
            (slot.class_group_id == group_id or 
             slot.teacher_id == teacher_id or 
             slot.classroom_id == classroom_id) and
            slot.day == day and 
            slot.lesson_number == lesson_number
            for slot in self.schedule
        )

        if has_conflict:
            return False

        # Check teacher lab ownership
        classroom = next((c for c in self.classrooms if c.id == classroom_id), None)
        if classroom and classroom.type == 'teacher_lab':
            # Find the owner of this teacher lab
            owner = next((t for t in self.teachers if t.home_classroom == classroom.id), None)
            
            if owner and owner.id != teacher_id:
                # This teacher lab belongs to another teacher - cannot use it
                return False

        return True

    def _select_best_slot(self, available_slots: List[ScheduleSlotSchema], requirement: LessonRequirement) -> Optional[ScheduleSlotSchema]:
        """Select the best slot from available options"""
        if not available_slots:
            return None

        # Score each slot based on various factors
        scored_slots = [(slot, self._score_slot(slot, requirement)) for slot in available_slots]

        # Sort by score (higher is better)
        scored_slots.sort(key=lambda x: x[1], reverse=True)

        return scored_slots[0][0]

    def _score_slot(self, slot: ScheduleSlotSchema, requirement: LessonRequirement) -> int:
        """Score a slot based on various factors"""
        score = 0

        # Prefer earlier in the week for important subjects
        day_index = self.institution.working_days.index(slot.day) if slot.day in self.institution.working_days else 0
        score += (len(self.institution.working_days) - day_index) * 2

        # Prefer middle lessons (not too early, not too late)
        middle_lesson = (self.institution.lessons_per_day + 1) // 2
        lesson_distance = abs(slot.lesson_number - middle_lesson)
        score += (self.institution.lessons_per_day - lesson_distance) * 3

        # Check for balanced distribution for this group
        group_lessons_on_day = len([
            s for s in self.schedule 
            if s.class_group_id == slot.class_group_id and s.day == slot.day
        ])
        score -= group_lessons_on_day * 5  # Penalty for overloading a day

        # HUGE bonus for teacher using their own lab
        teacher = next((t for t in self.teachers if t.id == slot.teacher_id), None)
        if teacher and teacher.home_classroom == slot.classroom_id:
            score += 100  # Very high priority for teacher's own classroom

        # HUGE bonus for using specialized classroom for the correct subject
        classroom = next((c for c in self.classrooms if c.id == slot.classroom_id), None)
        if classroom and classroom.type == 'lab' and classroom.specialization:
            allowed_subjects = classroom.specialization.split(', ')
            if requirement.subject_id in allowed_subjects:
                score += 50  # Very high priority for correct specialization

        # Bonus for consecutive lessons of the same subject (for labs)
        if requirement.subject_type == 'lab':
            has_consecutive = any(
                s.class_group_id == slot.class_group_id and
                s.subject_id == slot.subject_id and
                s.day == slot.day and
                abs(s.lesson_number - slot.lesson_number) == 1
                for s in self.schedule
            )
            if has_consecutive:
                score += 15

        return score

    def _calculate_lesson_time(self, lesson_number: int) -> Tuple[str, str]:
        """Calculate start and end time for a lesson"""
        start_hour, start_minute = map(int, self.institution.start_time.split(':'))
        current_minutes = start_hour * 60 + start_minute

        # Add time for previous lessons and breaks
        for i in range(1, lesson_number):
            current_minutes += self.institution.lesson_duration
            if i < self.institution.lessons_per_day and i - 1 < len(self.institution.break_durations):
                current_minutes += self.institution.break_durations[i - 1]

        start_time = self._format_time(current_minutes)
        end_time = self._format_time(current_minutes + self.institution.lesson_duration)

        return start_time, end_time

    def _format_time(self, minutes: int) -> str:
        """Format minutes to HH:MM string"""
        hours = minutes // 60
        mins = minutes % 60
        return f'{hours:02d}:{mins:02d}'

    def _optimize_schedule_distribution(self):
        """Optimize schedule distribution and log results"""
        self.log('🔧 Optimizing schedule distribution...')

        # Check for groups with uneven daily distribution
        for group in self.class_groups:
            daily_lessons = {}
            
            for day in self.institution.working_days:
                lessons_on_day = len([
                    s for s in self.schedule 
                    if s.class_group_id == group.id and s.day == day
                ])
                daily_lessons[day] = lessons_on_day

            max_lessons = max(daily_lessons.values()) if daily_lessons.values() else 0
            min_lessons = min(daily_lessons.values()) if daily_lessons.values() else 0
            
            if max_lessons - min_lessons > 2:
                self.log(f'⚠️ Uneven distribution for group {group.name}: {min_lessons}-{max_lessons} lessons per day')

        # Log specialized classroom usage
        specialized_labs = [c for c in self.classrooms if c.type == 'lab' and c.specialization]
        for lab in specialized_labs:
            lessons_in_lab = [s for s in self.schedule if s.classroom_id == lab.id]
            subjects = set(s.subject_id for s in lessons_in_lab)
            allowed_subjects = lab.specialization.split(', ') if lab.specialization else []
            
            self.log(f'🏫 Specialized Lab {lab.number}: {len(lessons_in_lab)} lessons')
            
            # Check if only allowed subjects are using this lab
            unauthorized_subjects = [subject_id for subject_id in subjects if subject_id not in allowed_subjects]
            
            if unauthorized_subjects:
                self.log(f'⚠️ Room {lab.number}: Unauthorized subjects detected!')
            else:
                self.log(f'✅ Room {lab.number}: Only authorized subjects scheduled')

        # Log teacher lab usage
        teacher_labs = [c for c in self.classrooms if c.type == 'teacher_lab']
        for lab in teacher_labs:
            owner = next((t for t in self.teachers if t.home_classroom == lab.id), None)
            lessons_in_lab = [s for s in self.schedule if s.classroom_id == lab.id]
            
            if owner:
                owner_lessons = [s for s in lessons_in_lab if s.teacher_id == owner.id]
                other_teacher_lessons = [s for s in lessons_in_lab if s.teacher_id != owner.id]
                
                self.log(f'👨‍🏫 Teacher Lab {lab.number} ({owner.first_name} {owner.last_name}): {len(lessons_in_lab)} total lessons')
                self.log(f'   📚 Owner\'s lessons: {len(owner_lessons)}')
                
                if other_teacher_lessons:
                    self.log(f'   ⚠️ Other teachers\' lessons: {len(other_teacher_lessons)} (This should not happen!)')
                else:
                    self.log(f'   ✅ Only owner uses this lab')
            else:
                self.log(f'🏫 Unassigned Teacher Lab {lab.number}: {len(lessons_in_lab)} lessons (available to all)')

        self.log('✅ Distribution optimization complete')