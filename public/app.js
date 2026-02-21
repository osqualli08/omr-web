// ==================== Global State ====================
let currentPage = 1;
let currentFilters = {
    search: '',
    filiere: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
};
let isEditing = false;

// ==================== Authentication ====================
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    window.location.href = 'login.html';
}

async function doLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout error:', e);
    }
    logout();
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Loading ====================
function showLoading() {
    document.getElementById('loading-overlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('show');
}

// ==================== Statistics ====================
async function loadStatistics() {
    try {
        const res = await fetch('/api/statistics');
        const data = await res.json();
        
        document.getElementById('total-students').textContent = data.total;
        document.getElementById('this-month-students').textContent = data.thisMonth;
        document.getElementById('total-filiere').textContent = data.filieres;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// ==================== Students ====================
async function fetchStudents() {
    const params = new URLSearchParams({
        ...currentFilters,
        page: currentPage,
        limit: 10
    });
    
    const res = await fetch(`/api/students?${params}`);
    return res.json();
}

function renderStudents(students, pagination) {
    const tbody = document.getElementById('students-tbody');
    const recordCount = document.getElementById('record-count');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <h3>Aucun étudiant trouvé</h3>
                        <p>Commencez par ajouter un étudiant</p>
                    </div>
                </td>
            </tr>
        `;
        recordCount.textContent = '0 enregistrement(s)';
        renderPagination(pagination);
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>#${student.id}</td>
            <td><strong>${student.name}</strong></td>
            <td>${student.firstname}</td>
            <td>${student.age} ans</td>
            <td>${student.email}</td>
            <td><span class="filiere-badge">${student.filiere}</span></td>
            <td>${formatDate(student.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-action btn-edit" onclick="editStudent(${student.id}, '${student.name}', '${student.firstname}', ${student.age}, '${student.email}', '${student.filiere}')" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteStudent(${student.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    recordCount.textContent = `${pagination.total} enregistrement(s)`;
    renderPagination(pagination);
}

function renderPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    const { page, totalPages } = pagination;
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let buttons = '';
    
    // Previous button
    buttons += `<button class="pagination-btn" onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
            buttons += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
            buttons += `<span class="pagination-info">...</span>`;
        }
    }
    
    // Next button
    buttons += `<button class="pagination-btn" onclick="goToPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    paginationEl.innerHTML = buttons;
}

function goToPage(page) {
    currentPage = page;
    loadStudents();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ==================== Form Handling ====================
function editStudent(id, name, firstname, age, email, filiere) {
    isEditing = true;
    document.getElementById('student-id').value = id;
    document.getElementById('name').value = name;
    document.getElementById('firstname').value = firstname;
    document.getElementById('age').value = age;
    document.getElementById('email').value = email;
    document.getElementById('filiere').value = filiere;
    
    document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save"></i><span>Mettre à jour</span>';
    document.getElementById('cancel-btn').style.display = 'flex';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    isEditing = false;
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
    document.getElementById('submit-btn').innerHTML = '<i class="fas fa-plus"></i><span>Ajouter l\'étudiant</span>';
    document.getElementById('cancel-btn').style.display = 'none';
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('student-id').value;
    const name = document.getElementById('name').value.trim();
    const firstname = document.getElementById('firstname').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const email = document.getElementById('email').value.trim();
    const filiere = document.getElementById('filiere').value;
    
    const payload = { name, firstname, age, email, filiere };
    
    showLoading();
    
    try {
        let res;
        if (id) {
            res = await fetch(`/api/students/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const data = await res.json();
        
        if (res.ok) {
            showToast(id ? 'Étudiant mis à jour avec succès!' : 'Étudiant ajouté avec succès!', 'success');
            resetForm();
            loadStudents();
            loadStatistics();
        } else {
            showToast(data.error || 'Une erreur est survenue', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Une erreur est survenue', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteStudent(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet étudiant?')) {
        return;
    }
    
    showLoading();
    
    try {
        const res = await fetch(`/api/students/${id}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            showToast('Étudiant supprimé avec succès!', 'success');
            loadStudents();
            loadStatistics();
        } else {
            const data = await res.json();
            showToast(data.error || 'Une erreur est survenue', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Une erreur est survenue', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== Filters ====================
function setupFilters() {
    // Search
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            loadStudents();
        }, 300);
    });
    
    // Filière filter
    const filiereFilter = document.getElementById('filiere-filter');
    filiereFilter.addEventListener('change', (e) => {
        currentFilters.filiere = e.target.value;
        currentPage = 1;
        loadStudents();
    });
    
    // Sort
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split(',');
        currentFilters.sortBy = sortBy;
        currentFilters.sortOrder = sortOrder;
        currentPage = 1;
        loadStudents();
    });
}

// ==================== Export ====================
function exportToCSV() {
    const params = new URLSearchParams({
        search: currentFilters.search,
        filiere: currentFilters.filiere
    });
    
    window.location.href = `/api/students/export?${params}`;
}

// ==================== Initialize ====================
async function loadStudents() {
    try {
        const data = await fetchStudents();
        renderStudents(data.students, data.pagination);
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Erreur lors du chargement des étudiants', 'error');
    }
}

async function init() {
    if (!checkAuth()) return;
    
    setupFilters();
    
    // Load initial data
    await Promise.all([
        loadStatistics(),
        loadStudents()
    ]);
}

// Event Listeners
document.getElementById('student-form').addEventListener('submit', handleSubmit);
document.getElementById('cancel-btn').addEventListener('click', resetForm);

// Make functions global
window.goToPage = goToPage;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.exportToCSV = exportToCSV;
window.doLogout = doLogout;

// Initialize on load
window.addEventListener('load', init);
