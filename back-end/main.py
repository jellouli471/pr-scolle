from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uvicorn

# إنشاء تطبيق FastAPI
app = FastAPI(title="دورة البرمجة API")

# إعداد CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج، حدد الدومين الخاص بك
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# إعداد قاعدة البيانات
SQLALCHEMY_DATABASE_URL = "sqlite:///./students.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# نموذج قاعدة البيانات
class StudentDB(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    registration_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")  # pending, active, completed

# نموذج Pydantic للتحقق من البيانات
class StudentCreate(BaseModel):
    name: str
    email: str
    phone: str

class Student(StudentCreate):
    id: int
    registration_date: datetime
    status: str

    class Config:
        orm_mode = True

# إنشاء جداول قاعدة البيانات
Base.metadata.create_all(bind=engine)

# وظيفة مساعدة للحصول على جلسة قاعدة البيانات
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# المسارات

@app.post("/students/", response_model=Student)
async def create_student(student: StudentCreate):
    db = next(get_db())
    
    # التحقق من وجود البريد الإلكتروني
    existing_student = db.query(StudentDB).filter(StudentDB.email == student.email).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    
    # إنشاء طالب جديد
    db_student = StudentDB(
        name=student.name,
        email=student.email,
        phone=student.phone
    )
    
    try:
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        return db_student
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students/")
async def get_students():
    db = next(get_db())
    students = db.query(StudentDB).all()
    return students

@app.get("/students/{student_id}")
async def get_student(student_id: int):
    db = next(get_db())
    student = db.query(StudentDB).filter(StudentDB.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return student

@app.put("/students/{student_id}")
async def update_student(student_id: int, student: StudentCreate):
    db = next(get_db())
    db_student = db.query(StudentDB).filter(StudentDB.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    
    # تحديث البيانات
    for key, value in student.dict().items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
    return db_student

@app.delete("/students/{student_id}")
async def delete_student(student_id: int):
    db = next(get_db())
    student = db.query(StudentDB).filter(StudentDB.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    
    db.delete(student)
    db.commit()
    return {"message": "تم حذف الطالب بنجاح"}

# تحديث كود JavaScript للتواصل مع FastAPI
@app.get("/script.js")
async def get_script():
    return """
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.querySelector('form');
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: form.querySelector('input[type="text"]').value,
                email: form.querySelector('input[type="email"]').value,
                phone: form.querySelector('input[type="tel"]').value
            };
            
            try {
                const response = await fetch('http://localhost:8001/students/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert('تم التسجيل بنجاح! سنتواصل معك قريباً');
                    form.reset();
                } else {
                    alert(data.detail || 'حدث خطأ في التسجيل');
                }
            } catch (error) {
                alert('حدث خطأ في الاتصال بالخادم');
                console.error(error);
            }
        });
    });
    """

# تشغيل التطبيق
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001) 