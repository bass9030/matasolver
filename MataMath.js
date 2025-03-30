/**
 * solutionInfo에 포함되있는 특수 문법을 일반 MathJax 문법으로 변환합니다.
 * @param {object} solutionInfo
 * @returns {object}
 */
function parseSolutionInfo(solutionInfo) {
    // console.log(solutionInfo);
    let expText = solutionInfo.questionInfo.expText.replaceAll("\n", "<br>");
    let title = solutionInfo.questionInfo.text.replaceAll("\n", "<br>");
    let regex = /#\[[A-z0-9]{6}\|([^\:]+)::([^#]*)\]#/g;
    let graph_regex = /#\([A-z0-9]{6}\|([^\:]+)::([^#]*)\)#/g;

    for (match of expText.match(regex) || []) {
        // console.log('matchText', match);
        if (!!!match) continue;
        let displayText = match.split("::")[1].slice(0, -2);
        // console.log(match, '|', displayText);
        expText = expText.replace(match, displayText);
    }

    for (match of expText.match(graph_regex) || []) {
        // console.log('matchText', match);
        if (!!!match) continue;
        let displayText = match.split("::")[1].slice(0, -2);
        // console.log(match, '|', displayText);
        expText = expText.replace(match, displayText);
    }

    matchs = title.match(regex);
    if (!!matchs) {
        for (match of matchs) {
            // console.log('matchText', match);
            let displayText = match.split("::")[1].slice(0, -2);
            // console.log(match, '|', displayText);
            title = title.replace(match, displayText);
        }
    }

    let imgregex = /#\[img_[0-9]+_[0-9]+\]#/g;
    let imgMatchs = expText.match(imgregex);
    if (!!imgMatchs) {
        for (match of imgMatchs) {
            let imgNum = match.split("_")[2].slice(0, -2);
            // console.log('imgNum', imgNum);
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
                `<img src="https://ai.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`
            );
        }
    }
    imgMatchs = title.match(imgregex);
    if (!!imgMatchs) {
        for (match of imgMatchs) {
            let imgNum = match.split("_")[2].slice(0, -2);
            // console.log('question imgNum', imgNum);
            // console.log(solutionInfo);
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
                `<img src="https://ai.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`
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
            `https://ai.matamath.net/api/v5/lesson/student/eval?lessonId=${ExamInfo.lessonId}&lessonItemId=${ExamInfo.lessonItemId}&curriculumItemId=${ExamInfo.curriculumItemId}&treatNo=${ExamInfo.treatNo}&deptId=${ExamInfo.deptId}`,
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
            `https://ai.matamath.net/api/v5/lesson/student/eval-question?evalQuestionId=${questionId}`,
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
