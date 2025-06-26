from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

# Institution Schemas
class InstitutionBase(BaseModel):
    name: str
    type: str = "college"
    working_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    lessons_per_day: int = 4
    lesson_duration: int = 70
    break_durations: List[int] = [10, 20, 10]
    start_time: str = "09:00"
    academic_weeks: int = 40
    specializations: List[str] = []

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    working_days: Optional[List[str]] = None
    lessons_per_day: Optional[int] = None
    lesson_duration: Optional[int] = None
    break_durations: Optional[List[int]] = None
    start_time: Optional[str] = None
    academic_weeks: Optional[int] = None
    specializations: Optional[List[str]] = None

class Institution(InstitutionBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ClassGroup Schemas
class ClassGroupBase(BaseModel):
    name: str
    type: str = "college_group"
    course: int = 1
    specialization: Optional[str] = None
    home_room: Optional[str] = None
    students_count: int = 25
    subject_hours: Dict[str, int] = {}

class ClassGroupCreate(ClassGroupBase):
    pass

class ClassGroupUpdate(BaseModel):
    name: Optional[str] = None
    course: Optional[int] = None
    specialization: Optional[str] = None
    home_room: Optional[str] = None
    students_count: Optional[int] = None
    subject_hours: Optional[Dict[str, int]] = None

class ClassGroup(ClassGroupBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Subject Schemas
class SubjectBase(BaseModel):
    name: str
    type: str  # 'theory' or 'lab'
    course: int
    specialization_required: Optional[str] = None
    teacher_ids: List[str] = []

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    course: Optional[int] = None
    specialization_required: Optional[str] = None
    teacher_ids: Optional[List[str]] = None

class Subject(SubjectBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Classroom Schemas
class ClassroomBase(BaseModel):
    number: str
    floor: int
    type: str  # 'theory', 'lab', 'teacher_lab'
    has_computers: bool = False
    specialization: Optional[str] = None
    capacity: int = 30

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomUpdate(BaseModel):
    number: Optional[str] = None
    floor: Optional[int] = None
    type: Optional[str] = None
    has_computers: Optional[bool] = None
    specialization: Optional[str] = None
    capacity: Optional[int] = None

class Classroom(ClassroomBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Teacher Schemas
class TeacherBase(BaseModel):
    first_name: str
    last_name: str
    subjects: List[str] = []
    available_hours: Dict[str, List[int]] = {}
    assigned_class_groups: List[str] = []
    home_classroom: Optional[str] = None

class TeacherCreate(TeacherBase):
    pass

class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    subjects: Optional[List[str]] = None
    available_hours: Optional[Dict[str, List[int]]] = None
    assigned_class_groups: Optional[List[str]] = None
    home_classroom: Optional[str] = None

class Teacher(TeacherBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ScheduleSlot Schemas
class ScheduleSlotBase(BaseModel):
    day: str
    lesson_number: int
    class_group_id: str
    subject_id: str
    teacher_id: str
    classroom_id: str
    start_time: str
    end_time: str

class ScheduleSlotCreate(ScheduleSlotBase):
    pass

class ScheduleSlotUpdate(BaseModel):
    day: Optional[str] = None
    lesson_number: Optional[int] = None
    class_group_id: Optional[str] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    classroom_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ScheduleSlot(ScheduleSlotBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Bulk Generation Schemas
class BulkClassroomGeneration(BaseModel):
    floors: int
    rooms_per_floor: int

class BulkGroupGeneration(BaseModel):
    years: List[int]
    specializations: List[str]

# Schedule Generation Schemas
class ScheduleGenerationRequest(BaseModel):
    clear_existing: bool = True

class ScheduleGenerationResult(BaseModel):
    success: bool
    schedule: List[ScheduleSlot]
    error: Optional[str] = None
    logs: List[str] = []

# Configuration Export/Import
class ConfigurationExport(BaseModel):
    institution: Institution
    class_groups: List[ClassGroup]
    subjects: List[Subject]
    classrooms: List[Classroom]
    teachers: List[Teacher]
    schedule: List[ScheduleSlot]
    export_date: datetime
    version: str = "1.0"

class ConfigurationImport(BaseModel):
    institution: InstitutionCreate
    class_groups: List[ClassGroupCreate] = []
    subjects: List[SubjectCreate] = []
    classrooms: List[ClassroomCreate] = []
    teachers: List[TeacherCreate] = []
    schedule: List[ScheduleSlotCreate] = []