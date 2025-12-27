// 1. Firebase 라이브러리 로드
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 2. Firebase 설정 (image_562b88.png의 새로운 값 반영)
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

/* --- [관리자] 로그인 및 화면 전환 --- */
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
        alert("데이터베이스 접속 중 오류가 발생했습니다. (규칙 설정을 확인해주세요!)");
    }
}

/* --- [관리자] 월 버튼 생성 --- */
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

/* --- [관리자] 사진 미리보기 --- */
window.previewImages = function(input) {
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

window.selectQuizPhoto = function(idx) {
    selectedQuizPhotoIdx = idx;
    document.querySelectorAll('.preview-item img').forEach(img => img.style.borderColor = "transparent");
    document.querySelectorAll('.badge').forEach(b => b.style.display = "none");
    document.getElementById(`prev_${idx}`).style.borderColor = "#ff6b6b";
    document.getElementById(`badge_${idx}`).style.display = "block";
}

/* --- [관리자] 데이터 저장 --- */
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
        alert("저장 중 오류가 발생했습니다. Storage 규칙을 확인해주세요!");
    }
}

/* --- [사용자] 앱 시작 --- */
async function startApp() {
    const f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();
    if (!f || !u) return alert("정보를 모두 입력해주세요! 😊");

    const q = query(collection(db, "memories"), where("family", "==", f));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return alert(`'${f}' 가족의 추억이 아직 없어요! 🤔`);

    localStorage.setItem('currentFamily', f);
    localStorage.setItem('currentUser', u);
    document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행`;
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
    
    renderUserMonthButtons(querySnapshot);
}

// 전역 등록
window.loginAdmin = loginAdmin;
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = async (ans) => {
    const correct = (ans == currentData.ans);
    alert(correct ? "정답이야! 🎉" : `아쉬워요! 정답은 ${currentData.ans}번! 😢`);
    const f = localStorage.getItem('currentFamily');
    const n = localStorage.getItem('currentUser');
    await setDoc(doc(db, "scores", `${f}_${n}_${currentData.month}`), { family: f, name: n, month: currentData.month, correct: correct });
};