let myScroll, scrollContainer;
let isDragging = false, currentX, currentY, initialX, initialY;

function openScroll() {
    myScroll.style.display = 'block';
}
function closeScroll () {
    myScroll.style.display = 'none';
}

function clearLocalStrorage() {
    const optValue = localStorage.getItem('optMyScroll');
    localStorage.clear();
    if (optValue !== null) {
        localStorage.setItem('optMyScroll', optValue);
    }

}
clearLocalStrorage();
function initOverlays() {
    myScroll = document.getElementById('myScroll');
    scrollContainer = document.querySelector('.scroll-container');
    if (!myScroll) {
        console.error("No User Guide Element!");
        return;
    }
    document.querySelector('.close-papy').addEventListener('click', function() {;
        closeScroll();
    });
    myScroll.addEventListener('click', (e) => {
        if (e.target === myScroll) {
            closeScroll();
        }
    });
    document.getElementById('manual').addEventListener('click', function() {
        openScroll();
    });
    document.getElementById('optCheckbox').addEventListener('change', function() {
        if(this.checked) {
            localStorage.setItem('optMyScroll', 'true');
        } else {
            localStorage.removeItem('optMyScroll');
        }
    });
    document.getElementById('scrollToTop').addEventListener('click', function() {
        document.querySelector('.overlay-text').scrollTo({ top: 0, behavior: 'smooth' });
    });
    const optOut = localStorage.getItem('optMyScroll');
    if(!optOut) {
        window.onload = function() {
            setTimeout(openScroll, 1000);
        };    
    }

    // DESCRIPTION TOGGLE
    const desContainer = document.getElementById('description-container');
    function disabledBut() {
        const buttons = ['openfolder', 'commonName', 'draw', 'delete', 'save-as', 'submit', 'convex', 'image'];
        if (desContainer.style.display === 'block') {
            buttons.forEach(btn => {
                document.getElementById(btn).disabled = true;
            })
        } else {
            buttons.forEach(btn => {
                document.getElementById(btn).disabled = false;
            })
        }
    }

    document.getElementById('description').addEventListener('click', function() {
        if(!window.culture.folderName) {
            alert("Please select a folder first in ")
        } else {
            document.getElementById('description-container').style.display = 'block';
            disabledBut();
        }
    });
    document.querySelector('.close-desc').addEventListener('click', function() {
        document.getElementById('description-container').style.display = 'none';
        disabledBut();
    });

    var turndownService = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced'
    });

    let CodeMode = false;

    // TEXT EDITOR FUNCTIONS
    const counters = new Map();
    document.querySelectorAll('.editor-wrapper').forEach(wrapper => {
        const editor = wrapper.querySelector('.text-container');
        if(!editor) {
            console.warn('No Text-container:', wrapper);
            return;
        }
        counters.set(editor,0);
        wrapper.querySelectorAll('.format-btn').forEach(button => {
            button.addEventListener('click', () => {
                editor.focus();
                const command = button.getAttribute('data-command');
                if(['bold','italic','insertUnorderedList','insertOrderedList'].includes(command)) {
                    document.execCommand(command, false, null);
                } else if(command === 'addStellariumReferences') {
                    let currentNumber = counters.get(editor) + 1;
                    counters.set(editor, currentNumber);
                    const textToInsert = `- [#${currentNumber}]: `;
                    document.execCommand('insertText', false, textToInsert);
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    range.collapse(false);
                } else if(command === 'Code-Preview') {
                    CodeMode = !CodeMode;
                    const codeView = wrapper.querySelector('.Code-View');
                    if(CodeMode) {
                        let markdown = turndownService.turndown(editor.innerHTML);
                        markdown = markdown.replace(/\\(#####+)/g, '$1');
                        codeView.value = markdown
                        editor.style.display = 'none';
                        codeView.style.display = 'block';
                        editor.contentEditable = 'false';
                    } else {
                        let markdownText = codeView.value;
                        let renderedHTML = marked.parse(markdownText);
                        editor.innerHTML = renderedHTML;
                        editor.style.display = 'block';
                        codeView.style.display = 'none';
                        editor.contentEditable = 'true';
                    }
                } else if (command === 'addconst') {
                    const insertconstText = `##### `;
                    document.execCommand('insertText', false, insertconstText);
                } else if (command === 'linked') {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const selectedText = range.toString();
                        if (selectedText.trim()) {
                            const url = prompt('Enter the URL for the hyperlink:');
                            if (url) {
                                const anchor = document.createElement('a');
                                anchor.href = url;
                                anchor.textContent = selectedText;
                                anchor.target = '_blank';
                                range.deleteContents();
                                range.insertNode(anchor);
                                selection.removeAllRanges();
                            }
                        }
                    }
                }
            });
        });
    });

    const sections = [
        {key: 'intro', textContainerId: 'intro-text-container', header: 'Introduction', type: 'single'},
        {
            key: 'dsc', 
            header:'Description', 
            type: 'multi-with-main', 
            maintextContainerId: 'dsc-text-container',
            mainKey: 'dsc',
            subs: [
                { subKey: 'sky', textContainerId: 'sky-text-container', subHeader: 'Sky' },
                { subKey: 'moonsun', textContainerId: 'moonsun-text-container', subHeader: 'Moon and Sun' },
                { subKey: 'planets', textContainerId: 'planets-text-container', subHeader: 'Planets' },
                { subKey: 'zodiac', textContainerId: 'zodiac-text-container', subHeader: 'Zodiac' },
                { subKey: 'milkyway', textContainerId: 'milkyway-text-container', subHeader: 'Milky Way' },
                { subKey: 'celobj', textContainerId: 'celobj-text-container', subHeader: 'Other Celestial Objects' },
            ]},
        {key: 'made', textContainerId: 'const-text-container', header: 'Constellations', type: 'single'},
        {key: 'ref', textContainerId: 'ref-text-container', header: 'References', type: 'single'},
        {
            key: 'authors', 
            header: 'Authors',
            type: 'multi-with-main', 
            maintextContainerId: 'authors-text-container',
            mainKey: 'authors',
            subs: [
                { subKey: 'about', textContainerId: 'about-text-container', subHeader: 'About' },
                { subKey: 'ack', textContainerId: 'ack-text-container', subHeader: 'Acknowledgements' },
            ]
        },
    ];

    sections.forEach(section => {
        const saveBtnId = section.type === 'single' ? `save-${section.key}` : `save-${section.key}`;
        const saveBtn = document.getElementById(saveBtnId);
        if (!saveBtn) return;

        saveBtn.addEventListener('click', () => {
            if (section.type === 'single') {
                const text = document.getElementById(section.textContainerId).innerHTML;
                const md = turndownService.turndown(text);
                localStorage.setItem(section.key, md);
            } else if (section.type === 'multi-with-main') {
                const mainText = document.getElementById(section.maintextContainerId);
                if (mainText) {
                    const mainHtml = mainText.innerHTML.trim();
                    const mainMd = turndownService.turndown(mainHtml);
                    localStorage.setItem(section.mainKey, mainMd);
                }
                section.subs.forEach(sub => {
                    const subText = document.getElementById(sub.textContainerId);
                    if (subText) {
                        const subHtml = subText.innerHTML.trim();
                        const subMd = turndownService.turndown(subHtml);
                        localStorage.setItem(sub.subKey, subMd);
                    }
                });
            }
            const container = document.getElementById(`${section.key}-container`);
            if (container) container.style.display = 'none';
        });
    });

    function generateDescription() {
        let contentParts = [`# ${window.culture.folderName}\n`];

        sections.forEach(section => {
            if (section.type === 'single') {
                const savedText = localStorage.getItem(section.key) || '' ;
                if (savedText.trim()) {
                    contentParts.push(`\n## ${section.header}\n\n${savedText.trim()}\n`);
                }
            } else if (section.type === 'multi-with-main') {
                const mainMd = localStorage.getItem(section.mainKey) || '';
                let subContents = [];
                section.subs.forEach(sub => {
                    const subMd = localStorage.getItem(sub.subKey) || '';
                    if (subMd.trim()) {
                        subContents.push(`\n### ${sub.subHeader}\n\n${subMd.trim()}\n`);
                    }
                });
                const hasMain = mainMd.trim() !== '';
                const hasAnySub = subContents.length > 0;
                if (hasMain || hasAnySub) {
                    contentParts.push(`\n## ${section.header}\n`);
                    if (hasMain) {
                        contentParts.push(`\n${mainMd.trim()}\n`);
                    }
                    if (hasAnySub) {
                        contentParts.push('\n');
                        contentParts.push(subContents.join('\n'));
                    }
                }
            }
        });
        const selectedLicense = localStorage.getItem('selectedLicense')|| 'None';
        if (selectedLicense && selectedLicense !== 'None') {
            contentParts.push(`\n## License\n\n${selectedLicense.trim()}\n`);
        }

        const finalContent = contentParts.join('').trim() + '\n';
        const textarea = document.getElementById('popupContent');
        textarea.textContent = finalContent + '\n\n ';
        popupdsc.style.display = 'block';
        
    };

    document.getElementById('save-description').addEventListener('click', () => {
        generateDescription();
        document.getElementById('description-container').style.display = 'none';
        disabledBut();
    });
    
    
    const popupdsc = document.getElementById('popup-description');
    const headerdsc = document.getElementById('popupHeader-description');

    headerdsc.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    function dragStart(e) {
        initialX = e.clientX - popupdsc.offsetLeft;
        initialY = e.clientY - popupdsc.offsetTop;
        isDragging = true;
    }
    function drag(e) {
        if(isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            popupdsc.style.left = currentX + 'px';
            popupdsc.style.top = currentY + 'px';
            popupdsc.style.right = 'auto';
        }
    }
    function dragEnd() { isDragging = false; }

    document.getElementById('close-popupdsc').addEventListener('click', function() {
        popupdsc.style.display = popupdsc.style.display === 'block' ? 'none' : 'block';
    })


    // INTRODUCTION TOGGLE
    document.getElementById('add-intro').addEventListener('click', function() {
        document.getElementById('intro-container').style.display = 'block';
    });
    document.querySelector('.close-intro').addEventListener('click', () => {
        document.getElementById('intro-container').style.display = 'none';
    });

    // DESCRIPTION TOGGLE
    document.getElementById('add-dsc').addEventListener('click', function() {
        document.getElementById('dsc-container').style.display = 'block';
    });
    document.querySelector('.close-dsc').addEventListener('click', () => {
        document.getElementById('dsc-container').style.display = 'none';
    });

    // MADE TOOGLE
    document.getElementById('add-made').addEventListener('click', function() {
        document.getElementById('made-container').style.display = 'block';
    });
    document.querySelector('.close-made').addEventListener('click', () => {
        document.getElementById('made-container').style.display = 'none';
    });
        
    // REF TOOGLE
    document.getElementById('add-ref').addEventListener('click', function() {
        document.getElementById('ref-container').style.display = 'block';
    });
    document.querySelector('.close-ref').addEventListener('click', () => {
        document.getElementById('ref-container').style.display = 'none';
    });

    // AUTHORS TOGGLE
    document.getElementById('add-authors').addEventListener('click', function() {
        document.getElementById('authors-container').style.display = 'block';
    });
    document.querySelector('.close-authors').addEventListener('click', () => {
        document.getElementById('authors-container').style.display = 'none';
    });

    document.getElementById('license-select').addEventListener('change', function() {
        const selectedValue = this.value;
        if (!selectedValue) return;
        localStorage.setItem('selectedLicense', selectedValue);
        
    });


}
window.initOverlays = initOverlays;
window.openScroll = openScroll;
window.closeScroll = closeScroll;
