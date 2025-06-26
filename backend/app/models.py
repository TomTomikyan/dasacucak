from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, DateTime, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import Dict, List, Optional
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Institution(Base):
    __tablename__ = "institutions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    type = Column(String, default="college")
    working_days = Column(JSON, default=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
    lessons_per_day = Column(Integer, default=4)
    lesson_duration = Column(Integer, default=70)  # minutes
    break_durations = Column(JSON, default=[10, 20, 10])  # break after each lesson
    start_time = Column(String, default="09:00")
    academic_weeks = Column(Integer, default=40)
    specializations = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ClassGroup(Base):
    __tablename__ = "class_groups"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    type = Column(String, default="college_group")
    course = Column(Integer, default=1)
    specialization = Column(String, nullable=True)
    home_room = Column(String, ForeignKey("classrooms.id"), nullable=True)
    students_count = Column(Integer, default=25)
    subject_hours = Column(JSON, default={})  # {subject_id: hours_per_year}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    home_classroom = relationship("Classroom", foreign_keys=[home_room])

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'theory' or 'lab'
    course = Column(Integer, nullable=False)
    specialization_required = Column(String, nullable=True)
    teacher_ids = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    number = Column(String, nullable=False, unique=True)
    floor = Column(Integer, nullable=False)
    type = Column(String, nullable=False)  # 'theory', 'lab', 'teacher_lab'
    has_computers = Column(Boolean, default=False)
    specialization = Column(String, nullable=True)  # comma-separated subject IDs
    capacity = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    subjects = Column(JSON, default=[])  # list of subject names
    available_hours = Column(JSON, default={})  # {day: [lesson_numbers]}
    assigned_class_groups = Column(JSON, default=[])  # list of group IDs
    home_classroom = Column(String, ForeignKey("classrooms.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    home_classroom_obj = relationship("Classroom", foreign_keys=[home_classroom])

class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    day = Column(String, nullable=False)
    lesson_number = Column(Integer, nullable=False)
    class_group_id = Column(String, ForeignKey("class_groups.id"), nullable=False)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(String, ForeignKey("teachers.id"), nullable=False)
    classroom_id = Column(String, ForeignKey("classrooms.id"), nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    class_group = relationship("ClassGroup")
    subject = relationship("Subject")
    teacher = relationship("Teacher")
    classroom = relationship("Classroom")