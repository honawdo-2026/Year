import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZuwP_9a46AWsxBnVnDCgCF7hF9tcg74s",
    authDomain: "year-5e6a5.firebaseapp.com",
    projectId: "year-5e6a5",
    storageBucket: "year-5e6a5.firebasestorage.app",
    messagingSenderId: "1071298463112",
    appId: "1:1071298463112:web:75704f169d255f0be1074a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let currentData = null;
let step = 0;
let photoDataUrls = [];
let selectedQuizPhotoIdx = null;

// [관리자] 로그인 (index.html 용)
async function loginAdmin() {
    const f = document.getElementById('adminFamilyGroup').value.trim();
    const p = document.getElementById('adminPassword').value.trim();
    if (!f || !p) return alert("가족 이름과 비번을 입력하세요!");

    try {
        const adminRef = doc(db, "admins", f);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
            if (confirm(`'${f}' 방을 새로 만들까요?`)) await setDoc(adminRef, { pw: p });
            else return;
        } else if (adminSnap.data().pw !== p) return alert("비번이 틀려요!");

        localStorage.setItem('editingFamily', f);
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminEditScreen').classList.add('active');
        document.getElementById('currentEditingFamily').innerText = `❤️ ${f} 관리 화면 ❤️`;
        createAdminMonthButtons();
    } catch (e) { alert("로그인 오류!"); }
}

function createAdminMonthButtons() {
    const grid = document.getElementById('adminMonthGrid');
    if(!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = "m-btn"; btn.innerText = `${i}월`;
        btn.onclick = () => {
            document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('selectedMonth').value = i;
        };
        grid.appendChild(btn);
    }
}

// [관리자] 저장 (index.html 용)
async function saveData() {
    const f = localStorage.getItem('editingFamily');
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("항목을 다 채워주세요!");

    alert("저장 중... 잠시만 기다려주세요!");
    try {
        const urls = [];
        for (let i = 0; i < photoDataUrls.length; i++) {
            const sRef = ref(storage, `photos/${f}/${m}/${i}.jpg`);
            await uploadString(sRef, photoDataUrls[i], 'data_url');
            urls.push(await getDownloadURL(sRef));
        }
        const quizImg = urls[selectedQuizPhotoIdx];
        const finalPhotos = [...urls.filter((_, i) => i !== selectedQuizPhotoIdx), quizImg];

        await setDoc(doc(db, "memories", `${f}_${m}`), {
            family: f, month: parseInt(m), photos: finalPhotos, quiz: q, opts: opts, ans: ans
        });
        alert(`${m}월 저장 완료!`);
    } catch (e) { alert("저장 실패!"); }
}

// [사용자] 여행 시작 (memory.html 용)
async function startApp() {
    const f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();
    if (!f || !u) return alert("이름을 입력해주세요!");

    try {
        // "우리집" 뿐만 아니라 혹시 모를 "우리집 " 공백 데이터까지 모두 검색
        const q = query(collection(db, "memories"), where("family", ">=", f), where("family", "<=", f + "\uf8ff"));
        const snap = await getDocs(q);

        if (snap.empty) return alert(`'${f}' 가족의 추억이 없습니다. 이름을 확인하세요!`);

        localStorage.setItem('currentFamily', f);
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행`;

        const bar = document.getElementById('userMonthBar');
        bar.innerHTML = "";
        const memories = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.family.trim() === f) memories.push(data);
        });
        memories.sort((a, b) => a.month - b.month);

        memories.forEach(data => {
            const btn = document.createElement('button');
            btn.className = "month-btn"; btn.innerText = `${data.month}월`;
            btn.onclick = () => {
                document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active-month'));
                btn.classList.add('active-month');
                currentData = data; step = 0;
                showContent();
            };
            bar.appendChild(btn);
        });
    } catch (e) { alert("데이터 조회 오류!"); }
}

function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="window.nextStep()" style="width:100%; border-radius:15px; cursor:pointer;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1} (터치하면 다음)`;
    } else {
        viewer.innerHTML = `
            <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img" style="width:100%; border-radius:15px;">
            <h3>❓ ${currentData.quiz}</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${currentData.opts.map((o, i) => `<button class="opt-btn" onclick="window.checkAnswer(${i+1})">${i+1}. ${o}</button>`).join('')}
            </div>`;
        info.innerText = "❓ 퀴즈 타임!";
    }
}

// 전역 등록 (이게 있어야 HTML의 onclick이 작동합니다)
window.loginAdmin = loginAdmin;
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = (ans) => alert(ans == currentData.ans ? "정답! 🎉" : "틀렸어요! 😢");
window.previewImages = function(input) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = ""; photoDataUrls = [];
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div'); div.className = "preview-item";
            div.innerHTML = `<img src="${e.target.result}" id="prev_${index}" onclick="selectQuizPhoto(${index})"><span class="badge" id="badge_${index}">퀴즈 사진</span>`;
            container.appendChild(div); photoDataUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
    });
};
window.selectQuizPhoto = function(idx) {
    selectedQuizPhotoIdx = idx;
    document.querySelectorAll('.preview-item img').forEach(img => img.style.borderColor = "transparent");
    document.getElementById(`prev_${idx}`).style.borderColor = "#ff6b6b";
};