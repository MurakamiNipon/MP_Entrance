import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const ALLOWED_ADMINS = [
    "chanatinat.cho@cra.ac.th",
    "chirapha.tan@cra.ac.th",
    "chirasak.kha@cra.ac.th",
    "danupon.nan@cra.ac.th",
    "kunlanan.pup@cra.ac.th",
    "napat.sri@cra.ac.th",
    "nipon.saiw@cra.ac.th",
    "pasit.jar@cra.ac.th",
    "sangutid.tho@cra.ac.th",
    "sasikarn.cha@cra.ac.th",
    "sukanya.thi@cra.ac.th",
    "supawan.usi@cra.ac.th",
    "thiansin.lia@cra.ac.th",
    "thunpisit.mun@cra.ac.th",
    "todsaporn.fua@cra.ac.th",
    "wilai.mas@cra.ac.th",
];

const WRITTEN_COLLECTION = "written_exam";
const ENGLISH_COLLECTION = "english_exam";
const GROUP_COLLECTION = "group_assessment_scores";
const INDIVIDUAL_COLLECTION = "individual_assessment_scores";
const FINAL_DECISION_COLLECTION = "final_decisions";

let questionStats = {}; 
let totalStudentCount = 0;
let instructorList = []; 

window.switchTab = (tabName, btn) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`view-${tabName}`).classList.add('active');
    btn.classList.add('active');
}

function sumRange(scores, start, end) {
    let total = 0;
    if(!scores) return 0;
    for(let i=start; i<=end; i++) {
        total += (parseInt(scores[`q${i}`]) || 0);
    }
    return total;
}

async function loadData() {
    const currentUserEmail = localStorage.getItem('staffEmail');

    if (!ALLOWED_ADMINS.includes(currentUserEmail)) {
        
        await Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์เข้าถึง (Access Denied)',
            text: 'กรุณาติดต่อขอดูผลกับ อาจารย์เตย และ อาจารย์นาซ่า นะคะ เพราะระบบจะระเบิดแล้วคะ!? (นิพล)',
            confirmButtonText: 'กลับสู่หน้าหลัก',
            allowOutsideClick: false
        });

        window.history.back(); 
        
        return; 
    }

    try {
        const [writtenSnap, engSnap, groupSnap, indSnap, finalSnap] = await Promise.all([
            getDocs(collection(db, WRITTEN_COLLECTION)),
            getDocs(collection(db, ENGLISH_COLLECTION)),
            getDocs(collection(db, GROUP_COLLECTION)),
            getDocs(collection(db, INDIVIDUAL_COLLECTION)),
            getDocs(collection(db, FINAL_DECISION_COLLECTION))
        ]);

        let studentMap = new Map();

        for(let i=1; i<=40; i++) questionStats[`q${i}`] = 0;
        totalStudentCount = 0;

        writtenSnap.forEach(doc => {
            const d = doc.data();
            const s = d.scores || {};
            totalStudentCount++;

            for(let i=1; i<=40; i++) {
                const val = parseInt(s[`q${i}`]) || 0;
                questionStats[`q${i}`] += val;
            }

            studentMap.set(d.name, {
                order: parseInt(d.order) || 999,
                name: d.name,
                uni: d.university || '-',
                major: d.major || '-',
                scores: s,
                phy: { mech: sumRange(s, 1, 4), em: sumRange(s, 5, 8), qm: sumRange(s, 9, 12), total: sumRange(s, 1, 12) },
                math: { cal: sumRange(s, 13, 16), lin: sumRange(s, 17, 19), prob: sumRange(s, 20, 22), total: sumRange(s, 13, 22) },
                rad: { prop: sumRange(s, 23, 25), int: sumRange(s, 26, 29), src: sumRange(s, 30, 33), act: sumRange(s, 34, 37), prot: sumRange(s, 38, 40), total: sumRange(s, 23, 40) },
                grandTotal: sumRange(s, 1, 40),
                eng: { reading: '-', writing: '-', total: '-' },
                groupAvg: '-',
                grp: { q1: '-', q2: '-', q3: '-', q4: '-', q5: '-' },
                decisions: {},
                finalDecision: ''
            });
        });

        engSnap.forEach(doc => {
            const d = doc.data();
            const name = doc.id; 
            if (studentMap.has(name)) {
                let st = studentMap.get(name);
                st.eng = {
                    reading: d.scores?.reading ?? '-',
                    writing: d.scores?.writing ?? '-',
                    total: d.total ?? '-'
                };
            } else {
                studentMap.set(name, {
                    order: parseInt(d.order) || 999, name: d.name || name, uni: d.university || '-', major: d.major || '-', scores: {},
                    phy: { total: '-' }, math: { total: '-' }, rad: { total: '-' }, grandTotal: '-',
                    eng: { reading: d.scores?.reading ?? '-', writing: d.scores?.writing ?? '-', total: d.total ?? '-' },
                    groupAvg: '-', grp: { q1: '-', q2: '-', q3: '-', q4: '-', q5: '-' }, decisions: {}, finalDecision: ''
                });
            }
        });

        let groupScoresMap = {};
        groupSnap.forEach(doc => {
            const d = doc.data();
            const name = d.studentName;
            if (!groupScoresMap[name]) {
                groupScoresMap[name] = { sum: 0, count: 0, q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 };
            }
            groupScoresMap[name].sum += (parseFloat(d.total) || 0);
            groupScoresMap[name].q1 += (parseFloat(d.scores?.q1) || 0);
            groupScoresMap[name].q2 += (parseFloat(d.scores?.q2) || 0);
            groupScoresMap[name].q3 += (parseFloat(d.scores?.q3) || 0);
            groupScoresMap[name].q4 += (parseFloat(d.scores?.q4) || 0);
            groupScoresMap[name].q5 += (parseFloat(d.scores?.q5) || 0);
            groupScoresMap[name].count += 1;
        });

        let indDecisionsMap = {}; 
        let instructorsSet = new Set();
        
        indSnap.forEach(doc => {
            const d = doc.data();
            const name = d.studentName;
            const instructor = d.instructorName || d.instructorEmail; 
            
            if (instructor) instructorsSet.add(instructor);
            if (!indDecisionsMap[name]) indDecisionsMap[name] = {};
            indDecisionsMap[name][instructor] = d.decision;
        });
        
        instructorList = Array.from(instructorsSet).sort();
        let finalDecisionsMap = {};
        finalSnap.forEach(doc => {
            finalDecisionsMap[doc.data().studentName] = doc.data().decision;
        });

        for (let [name, st] of studentMap.entries()) {
            if (groupScoresMap[name] && groupScoresMap[name].count > 0) {
                const c = groupScoresMap[name].count;
                st.groupAvg = (groupScoresMap[name].sum / c).toFixed(2);
                st.grp = {
                    q1: (groupScoresMap[name].q1 / c).toFixed(2),
                    q2: (groupScoresMap[name].q2 / c).toFixed(2),
                    q3: (groupScoresMap[name].q3 / c).toFixed(2),
                    q4: (groupScoresMap[name].q4 / c).toFixed(2),
                    q5: (groupScoresMap[name].q5 / c).toFixed(2)
                };
            }
            if (indDecisionsMap[name]) {
                st.decisions = indDecisionsMap[name];
            }
            if (finalDecisionsMap[name]) {
                st.finalDecision = finalDecisionsMap[name];
            }
        }

        let students = Array.from(studentMap.values());
        students.sort((a,b) => a.order - b.order);

        renderItemTable('tbodyPhy', 'tfootPhy', students, 1, 12);
        renderItemTable('tbodyMath', 'tfootMath', students, 13, 22);
        renderItemTable('tbodyRad', 'tfootRad', students, 23, 40);
        renderEnglishTable(students);
        renderGroupTable(students);
        renderSummaryTable(students);
        renderFinalDecisionTable(students);

        setupFinalDecisionListeners();

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

function renderGroupTable(students) {
    const tbody = document.getElementById('tbodyGrp');
    tbody.innerHTML = '';
    
    if(students.length === 0) { tbody.innerHTML = `<tr><td colspan="10">No Data</td></tr>`; return; }

    students.forEach(st => {
        tbody.innerHTML += `
            <tr>
                <td class="col-sticky-1">${st.order}</td>
                <td class="col-sticky-2 td-left">${st.name}</td>
                <td class="td-left">${st.uni}</td>
                <td class="td-left">${st.major}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.grp.q1}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.grp.q2}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.grp.q3}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.grp.q4}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.grp.q5}</td>
                <td style="font-weight: 800; background:#f8f5ff; color: #4c2889;">${st.groupAvg}</td>
            </tr>
        `;
    });
}

function renderFinalDecisionTable(students) {
    const thead = document.getElementById('theadFinal');
    const tbody = document.getElementById('tbodyFinal');
    const disabledAttr = ''; 

    thead.innerHTML = `
        <tr>
            <th rowspan="2" class="col-sticky-1">ลำดับ</th>
            <th rowspan="2" class="col-sticky-2">ชื่อ - นามสกุล</th>
            <th rowspan="2" style="min-width:180px;">มหาวิทยาลัย</th>
            <th rowspan="2" style="min-width:180px;">สาขา</th>
            <th colspan="4" class="th-group" style="color:#1C3879;">Summary</th>
            <th rowspan="2" style="color:#4A148C; min-width: 200px;">ผลพิจารณาสัมภาษณ์เดี่ยว<br>(Decisions)</th>
            <th rowspan="2" style="color:#4527A0; min-width: 140px; vertical-align: middle;">Final Decision<br>(มติที่ประชุม)</th>
        </tr>
        <tr>
            <th style="color:#DC2626;">Written (40)</th>
            <th style="color:#5F3DC4;">English (10)</th>
            <th style="color:#00695C;">Group (25)</th>
            <th style="color:#E65100;">รวม (75)</th>
        </tr>
    `;

    tbody.innerHTML = '';
    if(students.length === 0) { tbody.innerHTML = `<tr><td colspan="10">No Data</td></tr>`; return; }

    students.forEach(st => {
        
        let wScore = parseFloat(st.grandTotal) || 0;
        let eScore = parseFloat(st.eng.total) || 0;
        let gScore = parseFloat(st.groupAvg) || 0;
        
        let total75 = (wScore + eScore + gScore).toFixed(2);
        const engTotalDisp = (st.eng.total !== '-' && !isNaN(st.eng.total)) ? parseFloat(st.eng.total).toFixed(2) : '-';

        let rowHtml = `
            <tr>
                <td class="col-sticky-1">${st.order}</td>
                <td class="col-sticky-2 td-left">${st.name}</td>
                <td class="td-left">${st.uni}</td>
                <td class="td-left">${st.major}</td>
                <td style="font-weight:700; color:#DC2626; font-size:1rem;">${st.grandTotal}</td>
                <td style="font-weight:700; color:#4c2889; font-size:1rem;">${engTotalDisp}</td>
                <td style="font-weight:700; color:#00695C; font-size:1rem;">${st.groupAvg}</td>
                <td style="font-weight:700; color:#E65100; font-size:1rem;">${total75}</td>
        `;

        let decisionsHtml = '<div style="display:flex; flex-direction:column; gap:6px; text-align:left; padding: 5px 0;">';
        if (instructorList.length > 0) {
            instructorList.forEach((inst, idx) => {
                const decision = st.decisions[inst];
                const instFirstName = inst.split(' ')[0];

                let badge = '<span style="color:#ccc;">-</span>';
                if (decision === 'pass') {
                    badge = '<span class="decision-badge" style="background-color:var(--color-pass); color:white;"><i class="fas fa-check"></i> รับ</span>';
                } else if (decision === 'unsure') {
                    badge = '<span class="decision-badge" style="background-color:var(--color-unsure); color:white;"><i class="fas fa-question"></i> ไม่แน่ใจ</span>';
                } else if (decision === 'fail') {
                    badge = '<span class="decision-badge" style="background-color:var(--color-fail); color:white;"><i class="fas fa-times"></i> ไม่รับ</span>';
                }

                let borderStyle = (idx !== instructorList.length - 1) ? 'border-bottom: 1px dashed #eee; padding-bottom: 5px;' : '';

                decisionsHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; ${borderStyle}">
                        <span style="font-size:0.85rem; color:#444;">${instFirstName}</span>
                        ${badge}
                    </div>
                `;
            });
        } else {
            decisionsHtml += '<div style="text-align:center; color:#999;">-</div>';
        }
        decisionsHtml += '</div>';

        rowHtml += `<td>${decisionsHtml}</td>`;

        let selBg = '#FFFFFF';
        if(st.finalDecision === 'pass') selBg = '#E8F5E9';
        else if(st.finalDecision === 'fail') selBg = '#FFEBEE';

        rowHtml += `
            <td>
                <select class="final-decision-select" data-name="${st.name}" 
                        style="background-color: ${selBg};" ${disabledAttr}>
                    <option value="">-- เลือก --</option>
                    <option value="pass" style="color: #2e7d32; background: white;" ${st.finalDecision === 'pass' ? 'selected' : ''}>✅ รับ</option>
                    <option value="fail" style="color: #c62828; background: white;" ${st.finalDecision === 'fail' ? 'selected' : ''}>❌ ไม่รับ</option>
                </select>
            </td>
        </tr>`;
        
        tbody.innerHTML += rowHtml;
    });
}

function setupFinalDecisionListeners() {
    document.getElementById('tbodyFinal').addEventListener('change', async (e) => {
        if (e.target.classList.contains('final-decision-select')) {
            const selectEl = e.target;
            const studentName = selectEl.getAttribute('data-name');
            const val = selectEl.value;
            if(val === 'pass') selectEl.style.backgroundColor = '#E8F5E9';
            else if(val === 'fail') selectEl.style.backgroundColor = '#FFEBEE';
            else selectEl.style.backgroundColor = '#FFFFFF';

            selectEl.disabled = true;
            
            try {
                const docRef = doc(db, FINAL_DECISION_COLLECTION, studentName);
                await setDoc(docRef, {
                    studentName: studentName,
                    decision: val,
                    updatedAt: serverTimestamp(),
                    updatedBy: localStorage.getItem('staffEmail')
                }, { merge: true });
                
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500
                });
                Toast.fire({ icon: 'success', title: 'บันทึกมติเรียบร้อย' });
            } catch(err) {
                console.error(err);
                Swal.fire('Error', 'ไม่สามารถบันทึกได้', 'error');
            } finally {
                selectEl.disabled = false;
            }
        }
    });
}

function renderItemTable(tbodyId, tfootId, students, startQ, endQ) {
    const tbody = document.getElementById(tbodyId);
    const tfoot = document.getElementById(tfootId);
    tbody.innerHTML = ''; tfoot.innerHTML = '';
    
    if(students.length === 0) { tbody.innerHTML = `<tr><td colspan="20">No Data</td></tr>`; return; }

    students.forEach(st => {
        let rowHtml = `
            <tr>
                <td class="col-sticky-1">${st.order}</td>
                <td class="col-sticky-2 td-left">${st.name}</td>
                <td class="td-left">${st.uni}</td>
                <td class="td-left">${st.major}</td>
        `;
        for(let i=startQ; i<=endQ; i++) {
            const val = st.scores[`q${i}`];
            if (val === undefined) {
                rowHtml += `<td class="val-0">-</td>`; 
            } else {
                const displayVal = (val == 1) ? '1' : '0'; 
                const classVal = (val == 1) ? 'val-1' : 'val-0';
                rowHtml += `<td class="${classVal}">${displayVal}</td>`;
            }
        }
        rowHtml += `</tr>`;
        tbody.innerHTML += rowHtml;
    });

    let labelStyle1 = 'class="col-sticky-1" style="border-right: none;"';
    let labelStyle2 = 'class="col-sticky-2" style="border-right: none;"';
    let labelStyle3 = 'colspan="2" class="footer-label-cell"';

    let rowCount = `<tr><td ${labelStyle1}></td><td ${labelStyle2}></td><td ${labelStyle3}>ตอบถูกทั้งหมด (คน)</td>`;
    for(let i=startQ; i<=endQ; i++) { rowCount += `<td><b>${questionStats[`q${i}`]}</b></td>`; }
    rowCount += `</tr>`;

    let rowDiff = `<tr><td ${labelStyle1}></td><td ${labelStyle2}></td><td ${labelStyle3}>ค่าความยาก (p)</td>`;
    for(let i=startQ; i<=endQ; i++) {
        const p = totalStudentCount > 0 ? (questionStats[`q${i}`] / totalStudentCount).toFixed(2) : "0.00";
        rowDiff += `<td><b>${p}</b></td>`;
    }
    rowDiff += `</tr>`;

    let rowInter = `<tr><td ${labelStyle1}></td><td ${labelStyle2}></td><td ${labelStyle3}>พิจารณาความยาก</td>`;
    for(let i=startQ; i<=endQ; i++) {
        const p = totalStudentCount > 0 ? (questionStats[`q${i}`] / totalStudentCount) : 0;
        let text = "", bg = "";
        
        if (p >= 0.81) { text = "ง่ายมาก"; bg = "#00B050"; }
        else if (p >= 0.60) { text = "ง่าย"; bg = "#C6E0B4"; }
        else if (p >= 0.40) { text = "ปานกลาง"; bg = "#FFE699"; }
        else if (p >= 0.20) { text = "ยาก"; bg = "#FF9999"; }
        else { text = "ยากมาก"; bg = "#FF0000"; }

        rowInter += `<td style="background-color:${bg} !important; color:#000000; font-size:0.85rem; font-weight:700;">${text}</td>`;
    }
    rowInter += `</tr>`;

    tfoot.innerHTML = rowCount + rowDiff + rowInter;
}

function renderEnglishTable(students) {
    const tbody = document.getElementById('tbodyEng');
    tbody.innerHTML = '';
    
    if(students.length === 0) { tbody.innerHTML = `<tr><td colspan="7">No Data</td></tr>`; return; }

    students.forEach(st => {
        const engTotalDisp = (st.eng.total !== '-' && !isNaN(st.eng.total)) ? parseFloat(st.eng.total).toFixed(2) : '-';
        tbody.innerHTML += `
            <tr>
                <td class="col-sticky-1">${st.order}</td>
                <td class="col-sticky-2 td-left">${st.name}</td>
                <td class="td-left">${st.uni}</td>
                <td class="td-left">${st.major}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.eng.reading}</td>
                <td style="font-weight: 600; color: #5f3dc4;">${st.eng.writing}</td>
                <td style="font-weight: 800; background:#f8f5ff; color: #4c2889;">${engTotalDisp}</td>
            </tr>
        `;
    });
}

function renderSummaryTable(students) {
    const tbody = document.getElementById('tbodySum');
    tbody.innerHTML = '';
    if(students.length === 0) { tbody.innerHTML = `<tr><td colspan="22">No Data</td></tr>`; return; }

    students.forEach(st => {
        const p = st.phy; const m = st.math; const r = st.rad; const e = st.eng;
        const engTotalDisp = (e.total !== '-' && !isNaN(e.total)) ? parseFloat(e.total).toFixed(2) : '-';

        tbody.innerHTML += `
            <tr>
                <td class="col-sticky-1">${st.order}</td>
                <td class="col-sticky-2 td-left">${st.name}</td>
                <td class="td-left">${st.uni}</td>
                <td class="td-left">${st.major}</td>
                
                <td>${p.mech}</td><td>${p.em}</td><td>${p.qm}</td><td style="font-weight:700; background:#F5F8FF; color:#3F64E3;">${p.total}</td>
                <td>${m.cal}</td><td>${m.lin}</td><td>${m.prob}</td><td style="font-weight:700; background:#F5FCF8; color:#129C52;">${m.total}</td>
                <td>${r.prop}</td><td>${r.int}</td><td>${r.src}</td><td>${r.act}</td><td>${r.prot}</td><td style="font-weight:700; background:#FFFAF5; color:#E57125;">${r.total}</td>
                <td style="font-weight:700; background:#FEF2F2; color:#DC2626; font-size:1rem;">${st.grandTotal}</td>
                
                <td style="font-weight:600; color:#5f3dc4;">${e.reading}</td>
                <td style="font-weight:600; color:#5f3dc4;">${e.writing}</td>
                <td style="font-weight:700; background:#f8f5ff; color:#4c2889; font-size:1rem;">${engTotalDisp}</td>
            </tr>
        `;
    });
}

window.exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const options = { raw: true };
    const finalTable = document.getElementById('tableFinal').cloneNode(true);
    const selects = finalTable.querySelectorAll('select');
    selects.forEach(sel => {
        const selectedText = sel.options[sel.selectedIndex].text;
        sel.parentElement.innerText = selectedText.replace(/✅|❌|--/g, '').trim(); 
    });
    
    const decisionsDivs = finalTable.querySelectorAll('.decision-badge');
    decisionsDivs.forEach(div => {
         div.innerText = div.innerText.trim();
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tablePhy'), options), "Physics Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tableMath'), options), "Math Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tableRad'), options), "Radiation Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tableEng'), options), "English Scores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tableGrp'), options), "Group Assessment");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('tableSum'), options), "Summary Total");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(finalTable, options), "Final Decision");

    XLSX.writeFile(wb, "Entrance_Exam_Complete.xlsx");
}

loadData();