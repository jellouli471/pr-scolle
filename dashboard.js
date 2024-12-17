let currentStudentId = null;

// تحميل البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    setupSearchFilter();
});

// تحميل بيانات الطلاب
async function loadStudents() {
    try {
        const response = await fetch('http://localhost:8001/students/');
        const students = await response.json();
        updateStats(students);
        displayStudents(students);
    } catch (error) {
        showNotification('حدث خطأ في تحميل البيانات', 'error');
    }
}

// تحديث الإحصائيات
function updateStats(students) {
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('activeStudents').textContent = 
        students.filter(s => s.status === 'active').length;
    document.getElementById('pendingStudents').textContent = 
        students.filter(s => s.status === 'pending').length;
}

// عرض الطلاب في الجدول
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const date = new Date(student.registration_date).toLocaleDateString('ar-MA');
        
        row.innerHTML = `
            <td class="px-6 py-4">${student.name}</td>
            <td class="px-6 py-4">${student.email}</td>
            <td class="px-6 py-4">${student.phone}</td>
            <td class="px-6 py-4">${date}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-sm ${getStatusClass(student.status)}">
                    ${getStatusText(student.status)}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="editStudent(${student.id})" class="text-blue-600 hover:text-blue-800 ml-2">
                    تعديل
                </button>
                <button onclick="deleteStudent(${student.id})" class="text-red-600 hover:text-red-800">
                    حذف
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// البحث في الجدول
function setupSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#studentsTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// فتح النافذة المنبثقة للإضافة
function openAddModal() {
    currentStudentId = null;
    document.getElementById('modalTitle').textContent = 'إضافة طالب جديد';
    document.getElementById('studentForm').reset();
    document.getElementById('studentModal').style.display = 'flex';
}

// فتح النافذة المنبثقة للتعديل
async function editStudent(id) {
    currentStudentId = id;
    try {
        const response = await fetch(`http://localhost:8001/students/${id}`);
        const student = await response.json();
        
        document.getElementById('modalTitle').textContent = 'تعديل بيانات الطالب';
        document.getElementById('nameInput').value = student.name;
        document.getElementById('emailInput').value = student.email;
        document.getElementById('phoneInput').value = student.phone;
        document.getElementById('statusInput').value = student.status;
        
        document.getElementById('studentModal').style.display = 'flex';
    } catch (error) {
        showNotification('حدث خطأ في تحميل بيانات الطالب', 'error');
    }
}

// إغلاق النافذة المنبثقة
function closeModal() {
    document.getElementById('studentModal').style.display = 'none';
}

// حذف طالب
async function deleteStudent(id) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        try {
            const response = await fetch(`http://localhost:8001/students/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('تم حذف الطالب بنجاح', 'success');
                loadStudents();
            } else {
                showNotification('حدث خطأ في حذف الطالب', 'error');
            }
        } catch (error) {
            showNotification('حدث خطأ في الاتصال بالخادم', 'error');
        }
    }
}

// معالجة النموذج
document.getElementById('studentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const studentData = {
        name: document.getElementById('nameInput').value,
        email: document.getElementById('emailInput').value,
        phone: document.getElementById('phoneInput').value,
        status: document.getElementById('statusInput').value
    };
    
    try {
        const url = currentStudentId ? 
            `http://localhost:8001/students/${currentStudentId}` : 
            'http://localhost:8001/students/';
            
        const response = await fetch(url, {
            method: currentStudentId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        if (response.ok) {
            showNotification(
                currentStudentId ? 'تم تحديث بيانات الطالب بنجاح' : 'تم إضافة الطالب بنجاح',
                'success'
            );
            closeModal();
            loadStudents();
        } else {
            const data = await response.json();
            showNotification(data.detail || 'حدث خطأ في العملية', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

// دوال مساعدة
function getStatusClass(status) {
    const classes = {
        pending: 'bg-yellow-100 text-yellow-800',
        active: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800'
    };
    return classes[status] || '';
}

function getStatusText(status) {
    const texts = {
        pending: 'قيد الانتظار',
        active: 'نشط',
        completed: 'مكتمل'
    };
    return texts[status] || status;
}

function showNotification(message, type) {
    // يمكنك إضافة مكتبة للإشعارات مثل toastr
    alert(message);
} 