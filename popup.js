chrome.tabs.query({active: true, lastFocusedWindow: true}, async (tabs) => {
    let url = tabs[0].url;
    if(!url.startsWith('https://ai.matamath.net/')) {
        showFailScreen();
        return;
    }else{
        let ExamInfo = getExamInfo(url);
        if(!!!ExamInfo) {
            showFailScreen();
            return;
        }

        let questions = await getExamQuestions(ExamInfo);
        if(!!!questions) {
            showFailScreen();
            return;
        }
        console.log(questions);
        
        $(document).on('click', 'button.question', onQuestionClick)
        for(i of questions) {
            console.log(i);
            $('div.questions').append(`<button type="button" class="btn btn-primary question" data-questionId=${i.evalQuestionId}>${String(i.questionNo).padStart(2, '0')} [${i.questionType}]</button>`)
        }
    }
});

async function onQuestionClick(value) {
    let questionId = $(value.currentTarget).attr('data-questionId');
    let solution = await getSolution(questionId);

    $('div.solution').html(getSolutionElement(solution.evalDetailDto))
    await MathJax.typesetPromise(['span.title']);
    await MathJax.typesetPromise(['span.exp']);
}

function getSolutionElement(solutionInfo) {
    console.log(solutionInfo);
    let expText = solutionInfo.expText.replaceAll('\n', '<br>');
    let title = solutionInfo.text.replaceAll('\n', '<br>');
    let regex = /#[\(\[]([^\|]+)\|([^\:]+)::([^#]*)[\)\]]#/g
    let matchs = expText.match(regex);
    if(!!matchs) {
        for(match of matchs) {
            console.log('matchText', match);
            let displayText = match.split('::')[1].slice(0, -2);
            console.log(match, '|', displayText);
            expText = expText.replace(match, displayText);
        }
    }
    matchs = title.match(regex);
    if(!!matchs) {
        for(match of matchs) {
            console.log('matchText', match);
            let displayText = match.split('::')[1].slice(0, -2);
            console.log(match, '|', displayText);
            title = title.replace(match, displayText);
        }
    }

    let imgregex = /#\[img_[0-9]+_[0-9]+\]#/g
    let imgMatchs = expText.match(imgregex);
    if(!!imgMatchs) {
        for(match of imgMatchs) {
            let imgNum = match.split('_')[2].slice(0, -2);
            console.log('imgNum', imgNum);
            let imgIdx = solutionInfo.questionResourceList.findIndex((e) => {
                return e.imgNo === parseInt(imgNum);
            })
            let imgInfo = solutionInfo.questionResourceList[imgIdx];
            expText = expText.replace(match, `<img src="https://ai.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`);
        }
    }
    imgMatchs = title.match(imgregex);
    if(!!imgMatchs) {
        for(match of imgMatchs) {
            let imgNum = match.split('_')[2].slice(0, -2);
            console.log('imgNum', imgNum);
            let imgIdx = solutionInfo.questionResourceList.findIndex((e) => {
                return e.imgNo === parseInt(imgNum);
            })
            let imgInfo = solutionInfo.questionResourceList[imgIdx];
            title = title.replace(match, `<img src="https://ai.matamath.net/${imgInfo.imgLink}" style="width: ${imgInfo.imgWidth}; padding: ${imgInfo.imgPadding};"/>`);
        }
    }

    return `<span class="h2"><strong>${String(solutionInfo.questionNo).padStart(2, '0')} </strong></span><span class="title">${title}</span><hr><span class="exp">${expText}</span>`
}

//<button type="button" class="btn btn-primary">Button</button>

async function getCookies(domain, name) {
    return (await chrome.cookies.get({"url": domain, "name": name})).value;
}

async function getExamQuestions(ExamInfo) {
    let token = await getAccessToken();
    if(!!!token) return;
    let res = await (await fetch(`https://ai.matamath.net/api/v5/lesson/student/eval?lessonId=${ExamInfo.lessonId}&lessonItemId=${ExamInfo.lessonItemId}&curriculumItemId=${ExamInfo.curriculumItemId}&treatNo=${ExamInfo.treatNo}&deptId=${ExamInfo.deptId}`, 
    {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })).json();
    if(res.message === 'success') {
        return res.data.items;
    }else{
        return;
    }
}

async function getAccessToken() {
    // __Host-next-auth.csrf-token, __Secure-next-auth.session-token
    let hostToken = await getCookies('https://ai.matamath.net', '__Host-next-auth.csrf-token');
    let secureToken = await getCookies('https://ai.matamath.net', '__Secure-next-auth.session-token');
    document.cookie = `__Host-next-auth.csrf-token=${hostToken};__Secure-next-auth.session-token=${secureToken}`;
    let res = await (await fetch('https://ai.matamath.net/api/auth/session', {
        credentials: "same-origin"
    })).json();
    return res.accessToken;
}

async function getSolution(questionId) {
    // https://ai.matamath.net/api/v5/lesson/student/eval-question?evalQuestionId=14762521
    let token = await getAccessToken();
    if(!!!token) return;
    let res = await (await fetch(`https://ai.matamath.net/api/v5/lesson/student/eval-question?evalQuestionId=${questionId}`, 
    {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })).json();
    if(res.message === 'success') {
        return res.data;
    }else{
        return;
    }
}

function showFailScreen() {
    $('div.notSupport').css("display", 'block');
    $('div.root').css("display", 'none');
}

function getExamInfo(url) {
    const keyword = ['lessonId', 'lessonItemId', 'curriculumItemId', 'treatNo', 'deptId']
    let isExamUrl = true;
    for(i in keyword) {
        if(!url.includes(i)) {
            isExamUrl = false;
            break;
        }
    }
    if(!isExamUrl) return;

    return {
        lessonId: url.match(/lessonId=[0-9]+/g)[0].split('=')[1],
        lessonItemId: url.match(/lessonItemId=[0-9]+/g)[0].split('=')[1],
        curriculumItemId: url.match(/curriculumItemId=[0-9]+/g)[0].split('=')[1],
        treatNo: url.match(/treatNo=[0-9]+/g)[0].split('=')[1],
        deptId: url.match(/deptId=[0-9]+/g)[0].split('=')[1],
    }
}