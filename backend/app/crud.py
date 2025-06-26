from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from app import models, schemas
import uuid

# Institution CRUD
def get_institution(db: Session) -> Optional[models.Institution]:
    return db.query(models.Institution).first()

def create_institution(db: Session, institution: schemas.InstitutionCreate) -> models.Institution:
    db_institution = models.Institution(**institution.dict())
    db.add(db_institution)
    db.commit()
    db.refresh(db_institution)
    return db_institution

def update_institution(db: Session, institution_updates: schemas.InstitutionUpdate) -> Optional[models.Institution]:
    db_institution = db.query(models.Institution).first()
    if db_institution:
        update_data = institution_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_institution, field, value)
        db.commit()
        db.refresh(db_institution)
    return db_institution

# ClassGroup CRUD
def get_class_groups(db: Session) -> List[models.ClassGroup]:
    return db.query(models.ClassGroup).all()

def get_class_group(db: Session, group_id: str) -> Optional[models.ClassGroup]:
    return db.query(models.ClassGroup).filter(models.ClassGroup.id == group_id).first()

def create_class_group(db: Session, group: schemas.ClassGroupCreate) -> models.ClassGroup:
    db_group = models.ClassGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

def update_class_group(db: Session, group_id: str, group_updates: schemas.ClassGroupUpdate) -> Optional[models.ClassGroup]:
    db_group = db.query(models.ClassGroup).filter(models.ClassGroup.id == group_id).first()
    if db_group:
        update_data = group_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_group, field, value)
        db.commit()
        db.refresh(db_group)
    return db_group

def delete_class_group(db: Session, group_id: str) -> bool:
    db_group = db.query(models.ClassGroup).filter(models.ClassGroup.id == group_id).first()
    if db_group:
        db.delete(db_group)
        db.commit()
        return True
    return False

def bulk_create_class_groups(db: Session, years: List[int], specializations: List[str]) -> List[models.ClassGroup]:
    new_groups = []
    current_year = 2024  # You can make this dynamic
    
    for year in years:
        for spec_index, spec in enumerate(specializations):
            for stream in range(1, 4):  # 3 streams per specialization
                group_name = f"{str(year)[-1]}{spec_index + 1}{stream}"
                course = min(max(current_year - year + 1, 1), 4)
                
                db_group = models.ClassGroup(
                    name=group_name,
                    type="college_group",
                    course=course,
                    specialization=spec,
                    students_count=25,
                    subject_hours={}
                )
                new_groups.append(db_group)
    
    db.add_all(new_groups)
    db.commit()
    for group in new_groups:
        db.refresh(group)
    
    return new_groups

# Subject CRUD
def get_subjects(db: Session) -> List[models.Subject]:
    return db.query(models.Subject).all()

def get_subject(db: Session, subject_id: str) -> Optional[models.Subject]:
    return db.query(models.Subject).filter(models.Subject.id == subject_id).first()

def create_subject(db: Session, subject: schemas.SubjectCreate) -> models.Subject:
    db_subject = models.Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def update_subject(db: Session, subject_id: str, subject_updates: schemas.SubjectUpdate) -> Optional[models.Subject]:
    db_subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if db_subject:
        update_data = subject_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_subject, field, value)
        db.commit()
        db.refresh(db_subject)
    return db_subject

def delete_subject(db: Session, subject_id: str) -> bool:
    db_subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if db_subject:
        db.delete(db_subject)
        db.commit()
        return True
    return False

# Classroom CRUD
def get_classrooms(db: Session) -> List[models.Classroom]:
    return db.query(models.Classroom).all()

def get_classroom(db: Session, classroom_id: str) -> Optional[models.Classroom]:
    return db.query(models.Classroom).filter(models.Classroom.id == classroom_id).first()

def create_classroom(db: Session, classroom: schemas.ClassroomCreate) -> models.Classroom:
    db_classroom = models.Classroom(**classroom.dict())
    db.add(db_classroom)
    db.commit()
    db.refresh(db_classroom)
    return db_classroom

def update_classroom(db: Session, classroom_id: str, classroom_updates: schemas.ClassroomUpdate) -> Optional[models.Classroom]:
    db_classroom = db.query(models.Classroom).filter(models.Classroom.id == classroom_id).first()
    if db_classroom:
        update_data = classroom_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_classroom, field, value)
        db.commit()
        db.refresh(db_classroom)
    return db_classroom

def delete_classroom(db: Session, classroom_id: str) -> bool:
    db_classroom = db.query(models.Classroom).filter(models.Classroom.id == classroom_id).first()
    if db_classroom:
        db.delete(db_classroom)
        db.commit()
        return True
    return False

def bulk_create_classrooms(db: Session, floors: int, rooms_per_floor: int) -> List[models.Classroom]:
    new_classrooms = []
    
    for floor in range(1, floors + 1):
        for room in range(1, rooms_per_floor + 1):
            room_number = f"{floor}{room:02d}"
            
            # Check if room already exists
            existing = db.query(models.Classroom).filter(models.Classroom.number == room_number).first()
            if not existing:
                db_classroom = models.Classroom(
                    number=room_number,
                    floor=floor,
                    type="theory",
                    has_computers=False,
                    capacity=30
                )
                new_classrooms.append(db_classroom)
    
    if new_classrooms:
        db.add_all(new_classrooms)
        db.commit()
        for classroom in new_classrooms:
            db.refresh(classroom)
    
    return new_classrooms

# Teacher CRUD
def get_teachers(db: Session) -> List[models.Teacher]:
    return db.query(models.Teacher).all()

def get_teacher(db: Session, teacher_id: str) -> Optional[models.Teacher]:
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()

def create_teacher(db: Session, teacher: schemas.TeacherCreate) -> models.Teacher:
    db_teacher = models.Teacher(**teacher.dict())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def update_teacher(db: Session, teacher_id: str, teacher_updates: schemas.TeacherUpdate) -> Optional[models.Teacher]:
    db_teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if db_teacher:
        update_data = teacher_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_teacher, field, value)
        db.commit()
        db.refresh(db_teacher)
    return db_teacher

def delete_teacher(db: Session, teacher_id: str) -> bool:
    db_teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if db_teacher:
        db.delete(db_teacher)
        db.commit()
        return True
    return False

# ScheduleSlot CRUD
def get_schedule_slots(db: Session) -> List[models.ScheduleSlot]:
    return db.query(models.ScheduleSlot).all()

def get_schedule_slot(db: Session, slot_id: str) -> Optional[models.ScheduleSlot]:
    return db.query(models.ScheduleSlot).filter(models.ScheduleSlot.id == slot_id).first()

def create_schedule_slot(db: Session, slot: schemas.ScheduleSlotCreate) -> models.ScheduleSlot:
    db_slot = models.ScheduleSlot(**slot.dict())
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

def create_schedule_slots_bulk(db: Session, slots: List[schemas.ScheduleSlotCreate]) -> List[models.ScheduleSlot]:
    db_slots = [models.ScheduleSlot(**slot.dict()) for slot in slots]
    db.add_all(db_slots)
    db.commit()
    for slot in db_slots:
        db.refresh(slot)
    return db_slots

def update_schedule_slot(db: Session, slot_id: str, slot_updates: schemas.ScheduleSlotUpdate) -> Optional[models.ScheduleSlot]:
    db_slot = db.query(models.ScheduleSlot).filter(models.ScheduleSlot.id == slot_id).first()
    if db_slot:
        update_data = slot_updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_slot, field, value)
        db.commit()
        db.refresh(db_slot)
    return db_slot

def delete_schedule_slot(db: Session, slot_id: str) -> bool:
    db_slot = db.query(models.ScheduleSlot).filter(models.ScheduleSlot.id == slot_id).first()
    if db_slot:
        db.delete(db_slot)
        db.commit()
        return True
    return False

def clear_schedule(db: Session) -> bool:
    try:
        db.query(models.ScheduleSlot).delete()
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False

# Auto-assign teachers to subjects
def auto_assign_teachers_to_subjects(db: Session):
    """Auto-assign teachers to subjects based on their teaching subjects"""
    subjects = get_subjects(db)
    teachers = get_teachers(db)
    
    for subject in subjects:
        # Find teachers who teach this subject
        matching_teachers = [
            teacher for teacher in teachers 
            if subject.name in teacher.subjects
        ]
        
        # Update subject with matching teacher IDs
        if matching_teachers:
            subject.teacher_ids = [teacher.id for teacher in matching_teachers]
            db.commit()

# Clear all data
def clear_all_data(db: Session) -> bool:
    try:
        # Delete in correct order to avoid foreign key constraints
        db.query(models.ScheduleSlot).delete()
        db.query(models.Teacher).delete()
        db.query(models.Subject).delete()
        db.query(models.ClassGroup).delete()
        db.query(models.Classroom).delete()
        db.query(models.Institution).delete()
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False