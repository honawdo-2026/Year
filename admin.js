import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    const familyList = document.getElementById('familyList');

    try {
        const adminsSnapshot = await getDocs(collection(db, "admins"));
        const families = adminsSnapshot.docs.map(doc => doc.id);

        for (const family of families) {
            const memoriesSnapshot = await getDocs(collection(db, "memories"));
            const familyMemories = memoriesSnapshot.docs
                .map(doc => doc.data())
                .filter(data => data.family === family);

            const familyDiv = document.createElement('div');
            familyDiv.className = 'family-status';

            let content = `<h3>${family}</h3>`;
            if (familyMemories.length > 0) {
                content += '<ul>';
                familyMemories.forEach(memory => {
                    content += `<li>${memory.month}월: ${memory.photos.length}개의 사진, 퀴즈: ${memory.quiz ? '있음' : '없음'}</li>`;
                });
                content += '</ul>';
            } else {
                content += '<p>등록된 추억이 없습니다.</p>';
            }
            familyDiv.innerHTML = content;
            familyList.appendChild(familyDiv);
        }

    } catch (error) {
        console.error("Error fetching family data: ", error);
        familyList.innerHTML = '<p>데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
});