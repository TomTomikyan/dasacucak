from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import tempfile
import os
from datetime import datetime

from app.database import SessionLocal, engine, get_db
from app import models, schemas, crud
from app.schedule_generator import ScheduleGenerator

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="College Schedule Generator API",
    description="Backend API for College Schedule Generator",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Institution endpoints
@app.get("/api/institution", response_model=Optional[schemas.Institution])
def get_institution(db: Session = Depends(get_db)):
    return crud.get_institution(db)

@app.post("/api/institution", response_model=schemas.Institution)
def create_institution(institution: schemas.InstitutionCreate, db: Session = Depends(get_db)):
    # Check if institution already exists
    existing = crud.get_institution(db)
    if existing:
        raise HTTPException(status_code=400, detail="Institution already exists")
    return crud.create_institution(db, institution)

@app.put("/api/institution", response_model=schemas.Institution)
def update_institution(institution_updates: schemas.InstitutionUpdate, db: Session = Depends(get_db)):
    updated = crud.update_institution(db, institution_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Institution not found")
    return updated

# ClassGroup endpoints
@app.get("/api/class-groups", response_model=List[schemas.ClassGroup])
def get_class_groups(db: Session = Depends(get_db)):
    return crud.get_class_groups(db)

@app.get("/api/class-groups/{group_id}", response_model=schemas.ClassGroup)
def get_class_group(group_id: str, db: Session = Depends(get_db)):
    group = crud.get_class_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Class group not found")
    return group

@app.post("/api/class-groups", response_model=schemas.ClassGroup)
def create_class_group(group: schemas.ClassGroupCreate, db: Session = Depends(get_db)):
    return crud.create_class_group(db, group)

@app.put("/api/class-groups/{group_id}", response_model=schemas.ClassGroup)
def update_class_group(group_id: str, group_updates: schemas.ClassGroupUpdate, db: Session = Depends(get_db)):
    updated = crud.update_class_group(db, group_id, group_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Class group not found")
    return updated

@app.delete("/api/class-groups/{group_id}")
def delete_class_group(group_id: str, db: Session = Depends(get_db)):
    success = crud.delete_class_group(db, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Class group not found")
    return {"message": "Class group deleted successfully"}

@app.post("/api/class-groups/bulk-generate", response_model=List[schemas.ClassGroup])
def bulk_generate_class_groups(generation_data: schemas.BulkGroupGeneration, db: Session = Depends(get_db)):
    return crud.bulk_create_class_groups(db, generation_data.years, generation_data.specializations)

# Subject endpoints
@app.get("/api/subjects", response_model=List[schemas.Subject])
def get_subjects(db: Session = Depends(get_db)):
    return crud.get_subjects(db)

@app.get("/api/subjects/{subject_id}", response_model=schemas.Subject)
def get_subject(subject_id: str, db: Session = Depends(get_db)):
    subject = crud.get_subject(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@app.post("/api/subjects", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    # Auto-assign teachers
    teachers = crud.get_teachers(db)
    matching_teachers = [t for t in teachers if subject.name in t.subjects]
    subject.teacher_ids = [t.id for t in matching_teachers]
    
    return crud.create_subject(db, subject)

@app.put("/api/subjects/{subject_id}", response_model=schemas.Subject)
def update_subject(subject_id: str, subject_updates: schemas.SubjectUpdate, db: Session = Depends(get_db)):
    updated = crud.update_subject(db, subject_id, subject_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Subject not found")
    return updated

@app.delete("/api/subjects/{subject_id}")
def delete_subject(subject_id: str, db: Session = Depends(get_db)):
    success = crud.delete_subject(db, subject_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted successfully"}

# Classroom endpoints
@app.get("/api/classrooms", response_model=List[schemas.Classroom])
def get_classrooms(db: Session = Depends(get_db)):
    return crud.get_classrooms(db)

@app.get("/api/classrooms/{classroom_id}", response_model=schemas.Classroom)
def get_classroom(classroom_id: str, db: Session = Depends(get_db)):
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom

@app.post("/api/classrooms", response_model=schemas.Classroom)
def create_classroom(classroom: schemas.ClassroomCreate, db: Session = Depends(get_db)):
    return crud.create_classroom(db, classroom)

@app.put("/api/classrooms/{classroom_id}", response_model=schemas.Classroom)
def update_classroom(classroom_id: str, classroom_updates: schemas.ClassroomUpdate, db: Session = Depends(get_db)):
    updated = crud.update_classroom(db, classroom_id, classroom_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return updated

@app.delete("/api/classrooms/{classroom_id}")
def delete_classroom(classroom_id: str, db: Session = Depends(get_db)):
    success = crud.delete_classroom(db, classroom_id)
    if not success:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return {"message": "Classroom deleted successfully"}

@app.post("/api/classrooms/bulk-generate", response_model=List[schemas.Classroom])
def bulk_generate_classrooms(generation_data: schemas.BulkClassroomGeneration, db: Session = Depends(get_db)):
    return crud.bulk_create_classrooms(db, generation_data.floors, generation_data.rooms_per_floor)

# Teacher endpoints
@app.get("/api/teachers", response_model=List[schemas.Teacher])
def get_teachers(db: Session = Depends(get_db)):
    return crud.get_teachers(db)

@app.get("/api/teachers/{teacher_id}", response_model=schemas.Teacher)
def get_teacher(teacher_id: str, db: Session = Depends(get_db)):
    teacher = crud.get_teacher(db, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher

@app.post("/api/teachers", response_model=schemas.Teacher)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    created_teacher = crud.create_teacher(db, teacher)
    
    # Auto-assign this teacher to subjects they can teach
    crud.auto_assign_teachers_to_subjects(db)
    
    return created_teacher

@app.put("/api/teachers/{teacher_id}", response_model=schemas.Teacher)
def update_teacher(teacher_id: str, teacher_updates: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    updated = crud.update_teacher(db, teacher_id, teacher_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Auto-assign teachers to subjects after update
    crud.auto_assign_teachers_to_subjects(db)
    
    return updated

@app.delete("/api/teachers/{teacher_id}")
def delete_teacher(teacher_id: str, db: Session = Depends(get_db)):
    success = crud.delete_teacher(db, teacher_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted successfully"}

# Schedule endpoints
@app.get("/api/schedule", response_model=List[schemas.ScheduleSlot])
def get_schedule(db: Session = Depends(get_db)):
    return crud.get_schedule_slots(db)

@app.post("/api/schedule/generate", response_model=schemas.ScheduleGenerationResult)
async def generate_schedule(request: schemas.ScheduleGenerationRequest, db: Session = Depends(get_db)):
    # Clear existing schedule if requested
    if request.clear_existing:
        crud.clear_schedule(db)
    
    # Get all required data
    institution = crud.get_institution(db)
    if not institution:
        raise HTTPException(status_code=400, detail="Institution not configured")
    
    class_groups = crud.get_class_groups(db)
    subjects = crud.get_subjects(db)
    teachers = crud.get_teachers(db)
    classrooms = crud.get_classrooms(db)
    
    # Generate schedule
    generator = ScheduleGenerator(institution, class_groups, subjects, teachers, classrooms)
    result = await generator.generate_schedule()
    
    if result['success']:
        # Save generated schedule to database
        schedule_slots = []
        for slot_data in result['schedule']:
            slot_create = schemas.ScheduleSlotCreate(**slot_data)
            schedule_slots.append(slot_create)
        
        if schedule_slots:
            crud.create_schedule_slots_bulk(db, schedule_slots)
    
    return schemas.ScheduleGenerationResult(
        success=result['success'],
        schedule=[schemas.ScheduleSlot(**slot) for slot in result['schedule']],
        error=result.get('error'),
        logs=result.get('logs', [])
    )

@app.put("/api/schedule/{slot_id}", response_model=schemas.ScheduleSlot)
def update_schedule_slot(slot_id: str, slot_updates: schemas.ScheduleSlotUpdate, db: Session = Depends(get_db)):
    updated = crud.update_schedule_slot(db, slot_id, slot_updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule slot not found")
    return updated

@app.delete("/api/schedule/{slot_id}")
def delete_schedule_slot(slot_id: str, db: Session = Depends(get_db)):
    success = crud.delete_schedule_slot(db, slot_id)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule slot not found")
    return {"message": "Schedule slot deleted successfully"}

@app.delete("/api/schedule")
def clear_schedule(db: Session = Depends(get_db)):
    success = crud.clear_schedule(db)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear schedule")
    return {"message": "Schedule cleared successfully"}

# Configuration export/import
@app.get("/api/configuration/export")
def export_configuration(db: Session = Depends(get_db)):
    institution = crud.get_institution(db)
    class_groups = crud.get_class_groups(db)
    subjects = crud.get_subjects(db)
    classrooms = crud.get_classrooms(db)
    teachers = crud.get_teachers(db)
    schedule = crud.get_schedule_slots(db)
    
    config_data = schemas.ConfigurationExport(
        institution=institution,
        class_groups=class_groups,
        subjects=subjects,
        classrooms=classrooms,
        teachers=teachers,
        schedule=schedule,
        export_date=datetime.now(),
        version="1.0"
    )
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        json.dump(config_data.dict(), f, indent=2, default=str)
        temp_file = f.name
    
    institution_name = institution.name if institution else "college"
    filename = f"{institution_name.replace(' ', '_')}_configuration_{datetime.now().strftime('%Y-%m-%d')}.json"
    
    return FileResponse(
        temp_file,
        media_type='application/json',
        filename=filename,
        background=lambda: os.unlink(temp_file)  # Clean up temp file after response
    )

@app.post("/api/configuration/import")
async def import_configuration(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON file")
    
    try:
        content = await file.read()
        config_data = json.loads(content.decode('utf-8'))
        
        # Validate structure
        if 'institution' not in config_data or 'version' not in config_data:
            raise HTTPException(status_code=400, detail="Invalid configuration file format")
        
        # Clear existing data
        crud.clear_all_data(db)
        
        # Import institution
        if config_data['institution']:
            institution_create = schemas.InstitutionCreate(**config_data['institution'])
            crud.create_institution(db, institution_create)
        
        # Import classrooms
        for classroom_data in config_data.get('classrooms', []):
            classroom_create = schemas.ClassroomCreate(**classroom_data)
            crud.create_classroom(db, classroom_create)
        
        # Import subjects
        for subject_data in config_data.get('subjects', []):
            subject_create = schemas.SubjectCreate(**subject_data)
            crud.create_subject(db, subject_create)
        
        # Import class groups
        for group_data in config_data.get('class_groups', []):
            group_create = schemas.ClassGroupCreate(**group_data)
            crud.create_class_group(db, group_create)
        
        # Import teachers
        for teacher_data in config_data.get('teachers', []):
            teacher_create = schemas.TeacherCreate(**teacher_data)
            crud.create_teacher(db, teacher_create)
        
        # Import schedule
        for slot_data in config_data.get('schedule', []):
            slot_create = schemas.ScheduleSlotCreate(**slot_data)
            crud.create_schedule_slot(db, slot_create)
        
        return {"message": "Configuration imported successfully"}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# Clear all data
@app.delete("/api/configuration/clear")
def clear_all_data(db: Session = Depends(get_db)):
    success = crud.clear_all_data(db)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear all data")
    return {"message": "All data cleared successfully"}

# Health check
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)