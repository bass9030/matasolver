console.log("I'm Injected!");

window.addEventListener("load", () => {
    console.log("page loaded");
    checkLoad();
});

let ExamInfo;
let ExamQuestions;

async function checkLoad() {
    let buttons = document.querySelectorAll(
        "section > div:nth-child(1) > div > button"
    );
    if (!!!buttons.length) {
        setTimeout(checkLoad, 1000);
        return;
    }

    // Load Exam Info
    ExamInfo = await getExamInfo(window.location.href);
    ExamQuestions = await getExamQuestions(ExamInfo);
    console.log(ExamQuestions);

    buttons.forEach((button) => {
        button.addEventListener("click", async (event) => {
            if (!!!ExamInfo) return;
            let questionNum = parseInt(event.target.children[0].innerText);
            let questionId = ExamQuestions[questionNum - 1].evalQuestionId;
            // console.log(questionId)
            let solutionInfo = await parseSolutionInfo(
                await getSolution(questionId)
            );
            // console.log(solutionInfo);
            let questionDiv = document.querySelector(
                "section > div:nth-child(2) > div > div > div > div > div.swiper-no-swiping"
            );
            let detailsEl = document.querySelector(
                "section > div:nth-child(2) > div > div > div > div > div.swiper-no-swiping > details"
            );

            if (!!detailsEl) detailsEl.remove();

            let details = document.createElement("details");
            let summary = document.createElement("summary");
            summary.textContent = "해설 보기";

            let p = document.createElement("span");
            p.className = "solution-text";
            p.innerHTML = solutionInfo.expText;

            details.appendChild(summary);
            details.appendChild(p);
            details.style.margin = "0 20px";
            questionDiv.appendChild(details);
            window.MathJax.Hub.Typeset(p);
        });
    });
}

function addMoreBtn() {}
