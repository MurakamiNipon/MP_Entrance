import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, setDoc, doc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD5X264Dqy9QuLqcUagBFD-Y6LdxTnQaJ8",
    authDomain: "mp-entrance.firebaseapp.com",
    projectId: "mp-entrance",
    storageBucket: "mp-entrance.firebasestorage.app",
    messagingSenderId: "136386612299",
    appId: "1:136386612299:web:6cdfc55c94c00cca8d11ce",
    measurementId: "G-Z04M66B743"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "english_exam"; 
const STUDENT_COLLECTION = "student";

let allStudents = [];

async function loadStudents() {
    const selectEl = document.getElementById('studentSelect');
    selectEl.innerHTML = '<option value="">... กำลังโหลดรายชื่อ ...</option>';
    try {
        const [stdSnapshot, examSnapshot] = await Promise.all([
            getDocs(collection(db, STUDENT_COLLECTION)),
            getDocs(collection(db, COLLECTION_NAME))
        ]);
        const gradedNames = new Set();
        examSnapshot.forEach(doc => gradedNames.add(doc.id));
        allStudents = [];
        stdSnapshot.forEach((doc) => {
            const data = doc.data();
            allStudents.push({ id: doc.id, order: data.order, name: data.name, university: data.university, major: data.major });
        });
        allStudents.sort((a, b) => parseInt(a.order) - parseInt(b.order));
        selectEl.innerHTML = '<option value="">-- กรุณาเลือกรายชื่อ --</option>';
        allStudents.forEach(st => {
            const opt = document.createElement('option');
            opt.value = st.id; opt.text = st.name;
            if (gradedNames.has(st.name)) { opt.style.color = '#c62828'; opt.style.fontWeight = 'bold'; }
            selectEl.appendChild(opt);
        });
    } catch (error) { console.error(error); }
}

document.getElementById('studentSelect').addEventListener('change', function(e) {
    const student = allStudents.find(s => s.id === e.target.value);
    if (student) {
        document.getElementById('stdOrder').value = student.order;
        document.getElementById('stdUni').value = student.university;
        document.getElementById('stdMajor').value = student.major;
        document.getElementById('stdNameHidden').value = student.name; 
    } else {
        document.getElementById('stdOrder').value = "";
        document.getElementById('stdUni').value = "";
        document.getElementById('stdMajor').value = "";
        document.getElementById('stdNameHidden').value = "";
    }
});

const inputs = document.querySelectorAll('.sc-in');
inputs.forEach(input => {
    input.addEventListener('input', calculateFormTotal);
    input.addEventListener('change', function() {
        let val = parseFloat(this.value);
        if (isNaN(val)) return;
        this.value = val;
        calculateFormTotal();
    });
});

function calculateFormTotal() {
    let reading = parseFloat(document.getElementById('readingScore').value) || 0;
    let writing = parseFloat(document.getElementById('writingScore').value) || 0;
    let total = reading + writing;
    document.getElementById('displayTotal').innerText = total.toFixed(2);
}

document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('scoreForm').reset();
    document.getElementById('displayTotal').innerText = "0.00";
});

document.getElementById('scoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('studentSelect').value;
    const studentName = document.getElementById('stdNameHidden').value;
    
    if(!studentName) {
        Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้เข้าสอบ' });
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    let reading = parseFloat(document.getElementById('readingScore').value) || 0;
    let writing = parseFloat(document.getElementById('writingScore').value) || 0;
    let totalScore = parseFloat((reading + writing).toFixed(2));

    try {
        await setDoc(doc(db, COLLECTION_NAME, studentName), {
            studentId: studentId,
            name: studentName,
            university: document.getElementById('stdUni').value,
            major: document.getElementById('stdMajor').value,
            scores: { reading, writing },
            total: totalScore,
            timestamp: serverTimestamp()
        });
        
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
        
        const selectEl = document.getElementById('studentSelect');
        const selectedOption = selectEl.querySelector(`option[value="${studentId}"]`);
        if (selectedOption) {
            selectedOption.style.color = '#c62828';
            selectedOption.style.fontWeight = 'bold';
        }

        document.getElementById('scoreForm').reset();
        document.getElementById('displayTotal').innerText = "0.00";

    } catch (error) { 
        console.error(error); 
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล (Save)';
        btn.disabled = false;
    }
});

loadStudents();