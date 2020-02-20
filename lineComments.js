const debounce = (func, wait, immediate) => {
    let timeout;
    //the returned function needs to use this
    //so use the function keyword instead of const
    return function() {
        let context = this,
            args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

//takes an element and returns the top offset property
//the distance from the top of the screen in pixels
//calculates by recursively adding the top offset of each parent element
const getOffsetTop = element => {
    let offsetTop = 0;

    //while element evaluates to true
    while (element) {
        //add the offset of the element to offsetTop
        offsetTop += element.offsetTop;

        //set element to offsetParent
        //offsetParent will eventually be undefined
        element = element.offsetParent;
    }

    return offsetTop;
};

//takes an element and returns the left offset property
//the distance from the left side of the screen in pixels
//calculates by recursively adding the left offset of each parent element
const getOffsetLeft = element => {
    let offsetLeft = 0;
    while (element) {
        offsetLeft += element.offsetLeft;
        element = element.offsetParent;
    }
    return offsetLeft;
};

//adds a label span to the content string from a Jekyll post paragraph
const addLabelToContent = ({ content, label }) => {
    const labelSpan = getLabel(label);

    //use trim to remove whitespace from innerHTML
    const trimmed = content.trim();

    //make a new string with the lineLabel inside of the comment's <p> element
    return `${trimmed.slice(0, 3)}${labelSpan} ${trimmed.slice(
        3,
        trimmed.length - 1
    )}`;
};

//returns the block number of a comment
const getBlockNumber = comment =>
    comment.id && parseInt(comment.id.split('.')[1]);

//generates a span element with the label content
const getLabel = content => `<span class="line_label">${content}: </span>`;

//returns the line number of a comment
const getLineNumber = comment =>
    comment.id && parseInt(comment.id.split('.')[3]);

//adds a label and class to visually highlight invalidly assigned comments
const invalidCommentAssignment = comment => {
    const content = comment.innerHTML;

    //make a label span so the user can see what the invalid assignment is
    //non number assignments will show up as NaN
    const label = `Block: ${getBlockNumber(comment)} Line: ${getLineNumber(
        comment
    )}`;

    const newContent = addLabelToContent({ content, label });

    //set the comment innerHTML to the new contents with the label
    comment.innerHTML = newContent;

    comment.classList.add('invalid_assignment');
};

//finds all elements with the lineComment class
//positions them next to their assigned code block and line number
//if reposition is false, it's the first time, so it adds some interior elements to make content display correctly
const positionAllComments = reposition => {
    //wrapper is an element added by Jekyll
    const wrapper = document.getElementsByClassName('wrapper')[0];
    //we use the width of wrapper as the basis for calculating how wide to make the comments
    const wrapperWidth = wrapper.offsetWidth;
    //get the distance between the left side of the wrapper and the edge of the screen
    const wrapperLeft = getOffsetLeft(wrapper);

    //calculate commentWidth
    //commentWidth will be reduced later if the screen width is narrow
    let commentWidth =
        wrapperWidth * 0.5 > wrapperLeft ? wrapperLeft : wrapperWidth * 0.5;

    //get all lineComments from the document
    //getElementsByClassName returns an HTMLCollection
    //HTMLCollection is array-like, but is NOT a JavaScript Array
    //use the spread operator to make it an array
    const comments = [...document.getElementsByClassName('lineComment')];

    //get the line number element for each code block
    const codeBlocks = [...document.getElementsByClassName('lineno')];

    //first time through, find all comments assigned to invalid block numbers
    if (!reposition) {
        const highestBlockNumber = codeBlocks.length - 1;

        comments.forEach(comment => {
            const blockNumber = getBlockNumber(comment);
            //if it's not a number, lower than 0, or higher than the highest block number
            //it's invalid!
            if (
                isNaN(blockNumber) ||
                blockNumber < 0 ||
                blockNumber > highestBlockNumber
            )
                //call invalid comment assignment to label and highlight the comment
                invalidCommentAssignment(comment);
        });
    }

    //for each code block element with line numbers
    codeBlocks.forEach((codeBlock, blockIndex) => {
        //if it's the first time through
        //turn each line number into a div with an id
        if (!reposition) {
            let lineNumbers = codeBlock.innerHTML
                .split('\n')
                .map(
                    lineNumber =>
                        `<div id='block.${blockIndex}.line.${
                            lineNumber ? lineNumber : 'last'
                        }'>${lineNumber}</div>`
                )
                .join('');
            //set the innerHTML of the codeblock linenumber container
            codeBlock.innerHTML = lineNumbers;
        }

        //get the highest line number from the codeBlock
        const highestLineNumber = parseInt(
            [...codeBlock.childNodes][codeBlock.childNodes.length - 2].innerHTML
        );

        //filter to find the comments that are supposed to go in this block
        const blockComments = comments
            .filter(comment => getBlockNumber(comment) === blockIndex)
            //sort the comments by lineNumber, lowest to highest
            .sort((a, b) => getLineNumber(a) - getLineNumber(b))
            //remove comments with a lineNumber higher than the number of lineNumbers in the code block
            .filter(comment => {
                const lineNumber = getLineNumber(comment);
                const validLinenumber =
                    lineNumber > -1 && lineNumber <= highestLineNumber;
                //if the line number is not valid, add the invalid line number class
                //this will draw the users attention to their attempt to assign a lineNumber comment to an invalid line number
                !validLinenumber && invalidCommentAssignment(comment);

                return validLinenumber;
            });

        //get the left offset to position the comments horizontally
        const leftOffset = getOffsetLeft(codeBlock);

        //if comments are wider than the offset, they'll appear partially offscreen
        if (commentWidth > leftOffset && leftOffset > 50) {
            //set commentWidth to offset minus 50 to keep comment onscreen
            commentWidth = leftOffset - 50;
        }

        //position each comment next to its assigned line number in this block
        blockComments.forEach((comment, commentIndex) => {
            //get the assigned line number
            const lineNumber = getLineNumber(comment);

            //generate the id of the target comment
            const commentId = `block.${blockIndex}.line.${lineNumber}`;

            //use getElementById to find the div that contains the line number
            const targetLine = document.getElementById(commentId);

            //find the vertical position of the line number
            const topOffset = getOffsetTop(targetLine);

            //set the position of the comment
            console.log(`commentWidth`, commentWidth, wrapperWidth);
            comment.style.width = `${commentWidth}px`;
            comment.style.top = `${topOffset}px`;
            comment.style.left = `${leftOffset - commentWidth - 48}px`;

            //first time through add the line label and content div inside the comment
            //don't need to do it when repositioning
            if (!reposition) {
                //this comment gets the comment container style applied
                comment.classList.add('line_comment_container');

                //get the content of the comment
                const content = comment.innerHTML;

                //add a label span to the content
                const label = `Line: ${lineNumber}`;
                const labeledContent = addLabelToContent({ content, label });

                //the class is line_comment_content
                //which is max_height of 3 lines when collapsed
                let classList = 'line_comment_content';

                //returns undefined or the line number of the next comment
                const nextCommentLineNumber =
                    blockComments[commentIndex + 1] &&
                    getLineNumber(blockComments[commentIndex + 1]);

                //if the next comment is closer than 4 lines
                //make this comment_content single_height, so max_height of 1 line
                if (
                    nextCommentLineNumber !== undefined &&
                    nextCommentLineNumber - lineNumber < 4
                ) {
                    //make the comment container single height
                    comment.classList.add('single_height');
                    //content classList also has single height
                    classList += ' single_height';
                }

                //put the labeled content inside a div with the container classList
                const newContent = `<div class="${classList}">${labeledContent}</div>`;

                //set the comment innerHTML to the new div
                comment.innerHTML = newContent;
            }
        });
    });
};

//execute on load
//curly brackets mean an IIFE
{
    positionAllComments();
}

//a debounced function handles repeated calls by waiting until the calls stop
//then calling itself once
//resize events can happen repeatedly, don't want to run the code that many times
const debouncedPositionAllComments = debounce(positionAllComments);

//the event listener passes the event as an argument,
//so the parameter reposition will be true
window.addEventListener('resize', debouncedPositionAllComments);
