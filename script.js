/* --- [사용자 전용] 여행 시작 함수 부분 수정 --- */
async function startApp() {
    let f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();

    if (!f || !u) return alert("가족 이름과 본인 이름을 입력하세요! 😊");

    try {
        let q = query(collection(db, "memories"), where("family", "==", f));
        let snap = await getDocs(q);

        if (snap.empty) {
            q = query(collection(db, "memories"), where("family", "==", f + " "));
            snap = await getDocs(q);
        }

        if (snap.empty) return alert(`'${f}' 가족의 데이터를 찾을 수 없습니다.`);

        localStorage.setItem('currentFamily', f);
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        
        // 제목에서 "네" 제거: OOO 추억 여행 [아빠 요청 반영]
        document.getElementById('welcomeMsg').innerText = `🏠 ${f} 추억 여행`;

        const bar = document.getElementById('userMonthBar');
        bar.innerHTML = "";
        const memories = [];
        snap.forEach(doc => memories.push(doc.data()));
        memories.sort((a, b) => a.month - b.month);

        memories.forEach(data => {
            const btn = document.createElement('button');
            btn.className = "month-btn"; 
            btn.innerText = `${data.month}월`;
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

/* --- 퀴즈 화면 표시 함수 수정 --- */
function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="window.nextStep()" style="width:100%; border-radius:15px; cursor:pointer;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1}`;
    } else {
        // 퀴즈 레이아웃 수정: 문구 위치 및 Q 표시 [아빠 요청 반영]
        viewer.innerHTML = `
            <div style="text-align:center; margin-bottom:15px;">
                <h3 style="color:var(--primary); margin-bottom:5px;">✨ 여기서 잠깐! 퀴즈 타임!</h3>
                <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img" style="width:100%; border-radius:15px;">
                <h2 style="margin-top:15px;">Q. ${currentData.quiz}</h2>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${currentData.opts.map((o, i) => `<button class="opt-btn" onclick="window.checkAnswer(${i+1})">${i+1}. ${o}</button>`).join('')}
            </div>`;
        info.innerText = ""; // 하단 문구 비움
    }
}