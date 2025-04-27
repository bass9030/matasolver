// ==UserScript==
// @name         matasolver
// @namespace    http://tampermonkey.net/
// @version      2025-04-27
// @description  Displays the problem solving process
// @author       You
// @match        *://ts.matamath.net/*/*
// @icon         https://ts.matamath.net/common-images/common/favicon_mataedu.png
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";
    /**
     * solutionInfo에 포함되있는 특수 문법을 일반 MathJax 문법으로 변환합니다.
     * @param {object} solutionInfo
     * @returns {object}
     */
    function parseSolutionInfo(solutionInfo) {
        let expText = solutionInfo.questionInfo.expText.replaceAll(
            "\n",
            "<br>"
        );
        let title = solutionInfo.questionInfo.text.replaceAll("\n", "<br>");
        let regex = /#\[[A-z0-9]{6}\|([^\:]+)::([^#]*)\]#/g;
        let graph_regex = /#\([A-z0-9]{6}\|([^\:]+)::([^#]*)\)#/g;

        for (let match of expText.match(regex) || []) {
            if (!!!match) continue;
            let displayText = match.split("::")[1].slice(0, -2);
            expText = expText.replace(match, displayText);
        }

        for (let match of expText.match(graph_regex) || []) {
            if (!!!match) continue;
            let displayText = match.split("::")[1].slice(0, -2);
            expText = expText.replace(match, displayText);
        }

        let matchs = title.match(regex);
        if (!!matchs) {
            for (let match of matchs) {
                let displayText = match.split("::")[1].slice(0, -2);
                title = title.replace(match, displayText);
            }
        }

        let imgregex = /#\[img_[0-9]+_[0-9]+\]#/g;
        let imgMatchs = expText.match(imgregex);
        if (!!imgMatchs) {
            for (let match of imgMatchs) {
                let imgNum = match.split("_")[2].slice(0, -2);
                let imgIdx =
                    solutionInfo.questionInfo.questionResourceList.findIndex(
                        (e) => {
                            return e.imgNo === parseInt(imgNum);
                        }
                    );
                let imgInfo =
                    solutionInfo.questionInfo.questionResourceList[imgIdx];
                expText = expText.replace(
                    match,
                    `<img src="https://ts.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`
                );
            }
        }
        imgMatchs = title.match(imgregex);
        if (!!imgMatchs) {
            for (let match of imgMatchs) {
                let imgNum = match.split("_")[2].slice(0, -2);
                let imgIdx =
                    solutionInfo.questionInfo.questionResourceList.findIndex(
                        (e) => {
                            return e.imgNo === parseInt(imgNum);
                        }
                    );
                let imgInfo =
                    solutionInfo.questionInfo.questionResourceList[imgIdx];
                title = title.replace(
                    match,
                    `<img src="https://ts.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`
                );
            }
        }

        return { title, expText };
    }

    /**
     * 현재 시험의 문제목록을 불러옵니다.
     * @param {object} ExamInfo 시험 정보
     * @returns {object} 문제목록
     */
    async function getExamQuestions(ExamInfo) {
        let res = await (
            await fetch(
                `https://ts.matamath.net/api/v5/lesson/student/eval?lessonId=${ExamInfo.lessonId}&lessonItemId=${ExamInfo.lessonItemId}&curriculumItemId=${ExamInfo.curriculumItemId}&treatNo=${ExamInfo.treatNo}&deptId=${ExamInfo.deptId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: document.cookie
                            .split("token_access=")[1]
                            .split(";")[0],
                    },
                }
            )
        ).json();
        if (res.message === "success") {
            return res.data.items;
        } else {
            return;
        }
    }

    /**
     * questionId 문제의 해설을 불러옵니다.
     * @param {string} questionId 문제 ID
     * @returns {object} 해설 데이터
     */
    async function getSolution(questionId) {
        let res = await (
            await fetch(
                `https://ts.matamath.net/api/v5/lesson/student/eval-question?evalQuestionId=${questionId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: document.cookie
                            .split("token_access=")[1]
                            .split(";")[0],
                    },
                }
            )
        ).json();
        if (res.message === "success") {
            return res.data.evalDetailDto;
        } else {
            return;
        }
    }

    /**
     * 현재 페이지의 시험지 정보를 반환합니다.
     * @param {string} url
     * @returns {object} 시험지 정보
     */
    function getExamInfo(url) {
        const keyword = [
            "lessonId",
            "lessonItemId",
            "curriculumItemId",
            "treatNo",
            "deptId",
        ];
        let isExamUrl = true;
        for (let i of keyword) {
            if (!url.includes(i)) {
                isExamUrl = false;
                break;
            }
        }
        if (!isExamUrl) return;

        return {
            lessonId: url.match(/lessonId=[0-9]+/g)[0].split("=")[1],
            lessonItemId: url.match(/lessonItemId=[0-9]+/g)[0].split("=")[1],
            curriculumItemId: url
                .match(/curriculumItemId=[0-9]+/g)[0]
                .split("=")[1],
            treatNo: url.match(/treatNo=[0-9]+/g)[0].split("=")[1],
            deptId: url.match(/deptId=[0-9]+/g)[0].split("=")[1],
        };
    }

    console.log("[matasolver] script inject success");

    const { pushState, replaceState } = window.history;

    window.history.pushState = function (...args) {
        pushState.apply(window.history, args);
        window.dispatchEvent(new Event("pushState"));
    };

    window.history.replaceState = function (...args) {
        replaceState.apply(window.history, args);
        window.dispatchEvent(new Event("replaceState"));
    };

    window.addEventListener("popstate", () => pageUpdated());
    window.addEventListener("replaceState", () => pageUpdated());
    window.addEventListener("pushState", () => pageUpdated());

    let attamp = 0;

    function pageUpdated() {
        console.log("[matasolver] page change detect");
        attamp = 0;
        clearTimeout(timeoutQueue);
        loadSolve();
    }

    let ExamInfo;
    let ExamQuestions;
    let timeoutQueue;

    async function loadSolve() {
        // url match check
        if (
            !!!location.href.match(
                /(https|http):\/\/ts\.matamath\.net\/.+\/student\/lesson\/exam\/question/g
            )
        ) {
            return;
        }
        console.log("[matasolver] try to find solve");

        // page load check
        let questionArea = document.querySelector(
            "div.question-content > div > div:nth-child(1)"
        );
        if (!!!questionArea) {
            if (attamp > 5) {
                console.log("[matasolver] failed to find question area");
                return;
            }
            attamp++;
            clearTimeout(timeoutQueue);
            timeoutQueue = setTimeout(loadSolve, 500);
            return;
        }

        try {
            // Load Exam Info
            ExamInfo = getExamInfo(window.location.href);
            ExamQuestions = await getExamQuestions(ExamInfo);

            if (!!!ExamInfo) {
                console.log(
                    "[matasolver] 올바르지 않은 URL 형식:",
                    window.location.href
                );
                return;
            }

            let headerElement = questionArea.querySelector(
                "div > div:nth-child(1)"
            );

            // wait question load(2.5s)
            console.log("[matasolver] wait to load question area");
            let headerWaitCount = 0;
            while (!!!headerElement && headerWaitCount < 5) {
                await new Promise((resolve, reject) =>
                    setTimeout(() => resolve(), 500)
                );
                headerWaitCount++;
                headerElement = questionArea.querySelector(
                    "div > div:nth-child(1)"
                );
            }

            if (headerWaitCount >= 5) {
                console.log(
                    "[matasolver] question area not loaded for critical time"
                );
                return;
            }

            let questionNum = parseInt(headerElement.innerText);
            let questionId = ExamQuestions[questionNum - 1].evalQuestionId;

            console.log(
                "[matasolver] question change detect:",
                questionNum,
                questionId
            );

            let solutionInfo = await parseSolutionInfo(
                await getSolution(questionId)
            );

            let questionDiv = document.querySelector(
                "div.question-content-wrapper"
            );
            let detailsEl = document.querySelector(
                "div.question-content-wrapper > details"
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
            // details.style.margin = "0 20px";
            questionDiv.appendChild(details);
            window.MathJax.Hub.Typeset(p);
        } catch (e) {
            console.error(e);
            alert("풀이 불러오기에 실패했습니다.\n\nStackTrace:\n" + e);
        }
    }
})();
