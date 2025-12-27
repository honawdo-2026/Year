// 1. Firebase 라이브러리 로드
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 2. Firebase 설정 (아빠의 설정값 그대로 유지하세요)
const firebaseConfig = {
    apiKey: "AIzaSyBZuwP_9a46AWsxBnVnDCgCF7hF9tcg74s",
    authDomain: "year-5e6a5.firebaseapp.com",
    projectId: "year-5e6a5",
    storageBucket: "year-5e6a5.firebasestorage.app",
    messagingSenderId: "1071298463112",
    appId: "1:1071298463112:web:75704f169d255f0be1074a"
};

// 3. Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 전역 변수
let photoDataUrls = [];
let selectedQuizPhotoIdx = null;
let currentData = null;
let step = 0;

/* =========================================
   [관리자 기능] 로그인 및 추억 저장
   ========================================= */

async function loginAdmin() {
    const f = document.getElementById('adminFamilyGroup').value.trim();
    const p = document.getElementById('adminPassword').value.trim();
    if (!f || !p) return alert("이름과 비번을 입력해주세요! 😊");

    try {
        const adminRef = doc(db, "admins", f);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
            if (confirm(`'${f}' 가족 방을 새로 만들까요?`)) {
                await setDoc(adminRef, { pw: p });
            } else return;
        } else if (adminSnap.data().pw !== p) {
            return alert("비밀번호가 틀려요! 😢");
        }

        localStorage.setItem('editingFamily', f);
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminEditScreen').classList.add('active');
        document.getElementById('currentEditingFamily').innerText = `❤️ ${f} 가족 저장소 ❤️`;
        createAdminMonthButtons();
    } catch (e) {
        console.error(e);
        alert("데이터베이스 접속 중 오류가 발생했습니다.");
    }
}

function createAdminMonthButtons() {
    const grid = document.getElementById('adminMonthGrid');
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

function previewImages(input) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = ""; photoDataUrls = []; selectedQuizPhotoIdx = null;
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div'); div.className = "preview-item";
            div.innerHTML = `<img src="${e.target.result}" id="prev_${index}" onclick="selectQuizPhoto(${index})"><span class="badge" id="badge_${index}">퀴즈 사진</span>`;
            container.appendChild(div); photoDataUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function selectQuizPhoto(idx) {
    selectedQuizPhotoIdx = idx;
    document.querySelectorAll('.preview-item img').forEach(img => img.style.borderColor = "transparent");
    document.querySelectorAll('.badge').forEach(b => b.style.display = "none");
    document.getElementById(`prev_${idx}`).style.borderColor = "#ff6b6b";
    document.getElementById(`badge_${idx}`).style.display = "block";
}

async function saveData() {
    const f = localStorage.getItem('editingFamily');
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("월 선택과 퀴즈 사진 선택은 필수입니다!");

    alert("사진을 올리는 중입니다... 잠시만 기다려주세요! ⏳");

    try {
        const uploadedUrls = [];
        for (let i = 0; i < photoDataUrls.length; i++) {
            const storageRef = ref(storage, `photos/${f}/${m}/${i}.jpg`);
            await uploadString(storageRef, photoDataUrls[i], 'data_url');
            const url = await getDownloadURL(storageRef);
            uploadedUrls.push(url);
        }

        const quizImgUrl = uploadedUrls[selectedQuizPhotoIdx];
        const others = uploadedUrls.filter((_, i) => i !== selectedQuizPhotoIdx);
        const finalPhotos = [...others, quizImgUrl];

        await setDoc(doc(db, "memories", `${f}_${m}`), {
            family: f, month: parseInt(m), photos: finalPhotos, quiz: q, opts: opts, ans: ans
        });

        alert(`${m}월 추억 저장 완료! 💾`);
    } catch (e) {
        console.error(e);
        alert("저장 중 오류가 발생했습니다.");
    }
}

/* =========================================
   [사용자 기능] 추억 여행 및 퀴즈 (수정된 부분)
   ========================================= */

async function startApp() {
    const f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();
    if (!f || !u) return alert("가족 이름과 본인 이름을 입력해주세요! 😊");

    try {
        // 가족 이름으로 저장된 모든 달의 데이터를 가져옵니다. (월 순서대로 정렬)
        const q = query(collection(db, "memories"), where("family", "==", f));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return alert(`'${f}' 가족의 추억이 아직 없습니다. 관리자 페이지에서 먼저 등록해주세요! 🤔`);
        }

        localStorage.setItem('currentFamily', f);
        localStorage.setItem('currentUser', u);

        // 화면 전환
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행`;

        // 버튼 렌더링 함수 실행
        renderUserMonthButtons(querySnapshot);
    } catch (e) {
        console.error(e);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function renderUserMonthButtons(snapshot) {
    const bar = document.getElementById('userMonthBar');
    bar.innerHTML = ""; // 기존 버튼 초기화

    // 데이터를 월 순서대로 정렬하여 버튼 생성
    const memories = [];
    snapshot.forEach(doc => memories.push(doc.data()));
    memories.sort((a, b) => a.month - b.month);

    memories.forEach((data) => {
        const btn = document.createElement('button');
        btn.className = "month-btn"; 
        btn.innerText = `${data.month}월`;
        
        btn.onclick = () => {
            // 버튼 활성화 스타일 처리
            document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active-month'));
            btn.classList.add('active-month');
            
            // 데이터 설정 및 시작
            currentData = data; 
            step = 0;
            document.getElementById('resultBtn').style.display = "none";
            showContent();
        };
        bar.appendChild(btn);
    });
}

function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    
    if (!currentData) return;

    // 사진 목록 중 마지막(퀴즈용)을 제외한 일반 사진들 출력
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `
            <img src="${currentData.photos[step]}" class="photo-view" 
                 onclick="window.nextStep()" 
                 style="cursor:pointer; width:100%; border-radius:15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1} (터치하면 다음 사진)`;
    } else { 
        showQuiz(); 
    }
}

function showQuiz() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    info.innerText = "❓ 마지막 퀴즈 타임!";
    
    viewer.innerHTML = `
        <div class="quiz-container" style="animation: fadeIn 0.5s;">
            <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img" style="width:100%; border-radius:15px;">
            <h3 style="text-align:center; margin: 20px 0; color: #333;">❓ ${currentData.quiz}</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                ${currentData.opts.map((opt, i) => `
                    <button class="opt-btn" onclick="window.checkAnswer(${i+1})" 
                            style="padding:15px; border-radius:10px; border:1px solid #eee; background:white; font-weight:bold; cursor:pointer;">
                        ${i+1}. ${opt}
                    </button>`).join('')}
            </div>
        </div>`;
    
    // 12월까지 다 했을 때 결과 버튼 노출
    if (currentData.month == 12) document.getElementById('resultBtn').style.display = "block";
}

async function checkAnswer(ans) {
    const correct = (ans == currentData.ans);
    alert(correct ? "정답이야! 🎉" : `아쉬워요! 정답은 ${currentData.ans}번! 😢`);
    
    const f = localStorage.getItem('currentFamily');
    const n = localStorage.getItem('currentUser');
    
    try {
        await setDoc(doc(db, "scores", `${f}_${n}_${currentData.month}`), { 
            family: f, name: n, month: currentData.month, correct: correct 
        });
    } catch (e) {
        console.error("점수 저장 실패", e);
    }
}

async function showFinalResult() {
    const f = localStorage.getItem('currentFamily');
    const q = query(collection(db, "scores"), where("family", "==", f));
    const snap = await getDocs(q);
    
    const rank = {};
    snap.forEach(doc => {
        const d = doc.data();
        if(d.correct) rank[d.name] = (rank[d.name] || 0) + 1;
    });

    const sorted = Object.entries(rank).sort((a,b) => b[1] - a[1]);
    let t = `🏆 ${f} 가족 최종 순위 🏆\n\n`;
    if (sorted.length === 0) t += "아직 정답자가 없어요!";
    else sorted.forEach((p, i) => t += `${i+1}등: ${p[0]} (${p[1]}점)\n`);
    
    alert(t);
}

// 4. 전역 등록
window.loginAdmin = loginAdmin;
window.previewImages = previewImages;
window.selectQuizPhoto = selectQuizPhoto;
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = checkAnswer;
window.showFinalResult = showFinalResult;
window.showContent = showContent;