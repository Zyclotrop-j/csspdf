import axios from 'axios';
import _ from 'lodash';
import blobStream from './src/lib/blob-stream';
import PDFDocument from './src/lib/pdfkit';
import docReadyFactory from './src/lib/docReady';
import sizes from './src/lib/sizes';
import iFrameLayout from './src/iFrameLayout';
import stylesToTakeOver from './src/stylesToTakeOver';
import testDom from './testdata/testDom';


const docReady = {};
const documentContent = testDom;
docReadyFactory('docReady', docReady);

(function(PDFConstructor, stream){
    
    function debuug(data) {
        //console.log(data);
    }
    function toDataUrl(url) {
        return new Promise(function(res, rej){
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
              var reader = new FileReader();
              reader.onloadend = function() {
                res(reader.result);
              };
              reader.onerror = function(e){
                    rej(e, reader);
              };
              reader.readAsDataURL(xhr.response);
            };
            xhr.onerror = function(e){
                rej(e, xhr);
            };
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();
        });
    }
    const isProcessed = new Promise(res => {
        docReady.docReady(() => iFrameLayout(
            documentContent, debuug, debuug, debuug).then(res));
    });
    
    // Create block with 1ch at font-size 1ch
    const pxStrip = px => parseInt(px, 10);
    const rgb2hex = (rgb) => {
     rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
     return (rgb && rgb.length === 4) ? "#" +
      ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
      ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
      ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
    }
    const colorProc = color => {
        if (!color.startsWith('rgb')) return ({ color, alpha: 1 });
        if (color.startsWith('rgb') && !color.startsWith('rgba')) return ({ color: rgb2hex(color), alpha: 1 });
        const cMatch = color.match(/\d+/g);
        return ({ color: rgb2hex("rgb("+cMatch[0]+","+cMatch[1]+","+cMatch[2]+")"), alpha: cMatch[3] });
    };
    const fontMatchesMap = {
                'Times': 'Times-Roman',
                'Time-Bold': 'Times-Bold',
                'Times-Italic': 'Times-Italic',
                'Times-BoldItalic': 'Times-BoldItalic',
                'Times Roman': 'Times-Roman',
                'Times Roman-Bold': 'Times-Bold',
                'Times Roman-Italic': 'Times-Italic',
                'Times Roman-BoldItalic': 'Times-BoldItalic',
                'Helvetica': 'Helvetica',
                'Helvetica-BoldOblique' : ' Helvetica-BoldOblique',
                'Helvetica-Bold' : ' Helvetica-Bold',
                'Helvetica-Oblique' : ' Helvetica-Oblique',
                'Courier': 'Courier',
                'Courier-BoldOblique' : ' Courier-BoldOblique',
                'Courier-Bold' : ' Courier-Bold',
                'Courier-Oblique' : ' Courier-Oblique',
                'Symbol': 'Symbol',
                'ZapfDingbats': 'ZapfDingbats',
                /* windows uses Arial as default sans serif*/
                'Arial': 'Helvetica',
                'Arial-BoldOblique' : ' Helvetica-BoldOblique',
                'Arial-Bold' : ' Helvetica-Bold',
                'Arial-Oblique' : ' Helvetica-Oblique',
                /* windows uses Times New Roman as default serif*/
                'Times New Roman': 'Times-Roman',
                'Times New Roman-Bold': 'Times-Bold',
                'Times New Roman-Italic': 'Times-Italic',
                'Times New Roman-BoldItalic': 'Times-BoldItalic',
                /* windows uses Courier New as monospace */
                'Courier New': 'Courier',
                'Courier New-BoldOblique' : ' Courier-BoldOblique',
                'Courier New-Bold' : ' Courier-Bold',
                'Courier New-Oblique' : ' Courier-Oblique',
                /* Fallbacks */
                /* sans serif*/
                'Sans-Serif': 'Helvetica',
                'Sans-Serif-BoldOblique' : ' Helvetica-BoldOblique',
                'Sans-Serif-Bold' : ' Helvetica-Bold',
                'Sans-Serif-Oblique' : ' Helvetica-Oblique',
                /* serif*/
                'Serif': 'Times-Roman',
                'Serif-Bold': 'Times-Bold',
                'Serif-Italic': 'Times-Italic',
                'Serif-BoldItalic': 'Times-BoldItalic',
                /* monospace */
                'Monospace': 'Courier',
                'Monospace-BoldOblique' : ' Courier-BoldOblique',
                'Monospace-Bold' : ' Courier-Bold',
                'Monospace-Oblique' : ' Courier-Oblique',
            };
    const fontMatches = (fontString, bold, fontStyle) => {
        //font-style:  italic oblique normal
        const fonts = fontString.split(',');
        let alt = '';
        for(let i = 0; i < fonts.length; i++) {
            const oFont = (fonts[i][0] === '"' || fonts[i][0] === "'" ) ?
            fonts[i].slice(1, -1) : fonts[i];
            let fontName = oFont;
            if (bold || fontStyle !== 'normal') fontName+= '-';
            if (bold)fontName+= 'Bold';
            if (fontStyle !== 'normal') fontName+= fontStyle;
            const firstChoice = fontMatchesMap[fontName];
            if (firstChoice) return firstChoice;
            const secondChoice = Object.entries(fontMatchesMap).find(([k, v]) => k.toLowerCase() === fontName.toLowerCase());
            if (secondChoice) return secondChoice[1];
            if (!alt && fontMatchesMap[oFont]) alt = fontMatchesMap[oFont];
        }
        return alt || 'Times-Roman';
    };
    const processBorder = (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const colorAndAlpha = colorProc(otherAttrs.borderBottomColor);
            const width = pxStrip(otherAttrs.borderBottomWidth);
            // otherAttrs.borderBottomRadius; // make arc instead of line
            if (width <= 0) return false;
            if (setValue === 'none') return;
            if (setValue === 'hidden') return;
            if (setValue == 'solid') {
                doc.undash();
            } else if (setValue == 'dashed') {
                doc.dash(5, {space: 5});
            } else if (setValue == 'dotted') {
                doc.dash(10, {space: 10});
            } else if (['groove','ridge','inset','outset'].indexOf(setValue) || setValue === 'double') {
                console.warn('Currently unsupported borderStyle '+setValue);
                return;
            }
            const textWidth = doc.widthOfString(nodeContent || '');
            doc.lineWidth(width)
               .strokeOpacity(colorAndAlpha.alpha)
               .strokeColor (colorAndAlpha.color);
            return textWidth;
    };
    
    const processAttr = {
        fontFamily: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const isBold = otherAttrs.fontWeight === 'bold';
            const fontStyle = otherAttrs.fontStyle;
            // Process bold, fontStyle and fontFamily
            doc.font(fontMatches(setValue, isBold, fontStyle));
        },
        color: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const colorAndAlpha = colorProc(setValue);
            doc.fillColor(colorAndAlpha.color, colorAndAlpha.alpha);
        },
        fontSize: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            doc.fontSize(pxStrip(setValue));
        },
        backgroundColor: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const colorAndAlpha = colorProc(setValue);
            if (colorAndAlpha.alpha === 0 || colorAndAlpha.alpha == '0') return;
            doc.lineWidth(0)
               .fillColor(colorAndAlpha.color, colorAndAlpha.alpha)
               .rect(box.x, box.y, box.w, box.h)
               .fill(colorAndAlpha.color);
        },
        borderBottomStyle: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const drawBorder = processBorder(doc, attr, setValue, nodeContent, index, box, otherAttrs);
            if (!drawBorder) return;
            doc.moveTo(box.x, box.y + box.h)
               .lineTo(box.x + box.w, box.y + box.h)
               .stroke();
        },
        borderTopStyle: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const drawBorder = processBorder(doc, attr, setValue, nodeContent, index, box, otherAttrs);
            if (!drawBorder) return;
            doc.moveTo(box.x, box.y)
               .lineTo(box.x + box.w, box.y)
               .stroke();
        },
        borderLeftStyle: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const drawBorder = processBorder(doc, attr, setValue, nodeContent, index, box, otherAttrs);
            if (!drawBorder) return;
            doc.moveTo(box.x, box.y)
               .lineTo(box.x, box.y + box.h)
               .stroke();
        },
        borderRightStyle: (doc, attr, setValue, nodeContent, index, box, otherAttrs) => {
            const drawBorder = processBorder(doc, attr, setValue, nodeContent, index, box, otherAttrs);
            if (!drawBorder) return;
            doc.moveTo(box.x + box.w, box.y)
               .lineTo(box.x + box.w, box.y + box.h)
               .stroke();
        },
    };
    
    const cssFiles = ['./testdata/fonts'];
        
    const meta = {
         size: 'A4', //A4: [595.28, 841.89] points
         margins : { // by default, all are 72 = 1 inch
             top: 72, 
             bottom: 72,
             left: 72,
             right: 72
         },
         layout: 'portrait', // can be 'landscape'
         info: {
             Title: 'title', 
             Author: 'author', // the name of the author
             Subject: '', // the subject of the document
             Keywords: 'pdf;javascript', // keywords associated with the document
             CreationDate: 'DD/MM/YYYY', // the date the document was created (added automatically by PDFKit)
             ModDate: 'DD/MM/YYYY' // the date the document was last modified
         },
         bufferPages: true
    };
    
    const fontfanceregex = /@font-face[ ]?{[^]+?}/mg;
    const fontsAreReady = new Promise(resolve => {
        Promise.all(cssFiles.map(i => axios.get(`${i}.css`))).then(f => {
            const ffmatches = f.reduce((r, i) => {
                return r.concat(i.data.match(fontfanceregex).map(i => {
                    return new Promise((res, rej) => {
                        const fontdata = {
                            name: i.match(/font-family[ ]?:[ ]?.?(.+?).?;/)[1],
                            weight: (i.match(/font-weight[ ]?:[ ]?(.+?);/) || [0,''])[1],
                            path: i.match(/url\(.?(.+?\.(ttf|otf)).?\)/)[1],
                        };
                        return axios.get(fontdata.path, {
                            
                            responseType : 'arraybuffer'
                        }).then(q => res({
                            name: fontdata.name,
                            weight: fontdata.weight,
                            path: fontdata.path,
                            data: q.data
                        }));
                    });
                }));
            }, []);
            Promise.all(ffmatches).then(i => {
                i.forEach(v => {
                    fontMatchesMap[v.weight ? `${v.name}-${v.weight}` : v.name] = `${v.name}${v.weight}`;
                    doc.registerFont(`${v.name}${v.weight}`, v.data);
                });
                resolve();
            });
        });
    });
    
    
    //@font-face {
    //  font-family: 'HeadlandOne';
    //  src: url('../fonts/HeadlandOne-Regular.ttf'); /* IE9 Compat Modes */
    //}
    //TrueType (.ttf), OpenType (.otf)
    
    const mheight = sizes[meta.size][meta.layout === 'portrait' ? 0 : 1];
    const mwidth = sizes[meta.size][meta.layout === 'portrait' ? 1 : 0];
    
        // create a document and pipe to a blob
    var doc = new PDFConstructor(meta);
    var stream = doc.pipe(stream());
    let pparts = [];
    let numberOfPages = 0;
    fontsAreReady.then(() => {
        isProcessed.then(parts => {
            const additionalResources = [];
            pparts = parts.map((i, idx) => _.merge({}, i, { idx })).sort((a, b) => {
                // Fix the stacking context
                // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context
                // Must include ancesters
                // FIXME
                if (a.style.zIndex && b.style.zIndex && a.zIndex !== 'auto'  && b.zIndex !== 'auto') return parseInt(a.style.zIndex, 10) - parseInt(b.style.zIndex, 10);
                if (a.style.zIndex && a.zIndex !== 'auto') return 1;
                if (b.style.zIndex && b.zIndex !== 'auto') return -1;
                // More ordering here
                
                return a.idx - b.idx;
            });
            let lastPartWasContinuedFlag = false;
            
            
            
            console.log(pparts);
            
            
            pparts.forEach((part, idx, completeArray) => {
                let yval = part.pos.y;
                let currentlyOnNumber = 0;
                while (yval > mheight) {
                   yval -= mheight;
                   currentlyOnNumber += 1;
                   if (currentlyOnNumber > numberOfPages) {
                       doc.addPage();
                       numberOfPages += 1;
                   }
                }
                doc.switchToPage(currentlyOnNumber);
                // ToDo: Deal with custom fonts
                //doc.registerFont('Heading Font', 'fonts/Chalkboard.ttc', 'Chalkboard-Bold')
                //doc.font('Heading Font')
                Object.entries(part.style).forEach(([k, v], idx) => {
                    const box = part.pos;
                    if (processAttr[k]) {
                        //doc.save(); // Save current graphics stack
                        const newContent = processAttr[k](doc, k, v, part.content, idx, box, part.style);
                        if (newContent) part.content = newContent;
                        //doc.restore(); // Restore current graphics stack
                    }
                });
                const X = part.pos.x + pxStrip(part.style.borderLeftWidth) + pxStrip(part.style.marginLeft);
                const lineHeight = part.style.lineHeight;
                let lineH = null;
                if (lineHeight === 'normal') {
                    lineH = 1.2 *  pxStrip(part.style.fontSize);
                } else if (typeof lineHeight === 'number') {
                    lineH = lineHeight *  pxStrip(part.style.fontSize);
                } else {
                    lineH = pxStrip(part.style.fontSize);
                }
                const yCorrector = pxStrip(part.style.borderTopWidth) + pxStrip(part.style.marginTop) + lineH - pxStrip(part.style.fontSize);
                const margins = pxStrip(part.style.marginTop); // + pxStrip(part.style.marginBottom);
                const Y = yval + yCorrector ;
                const isContinued = part.style.continued;
                let sectionWidth = part.pos.w;
                let sectionHeight = (part.pos.h + margins);
                if (isContinued && !lastPartWasContinuedFlag) {
                    // Adjust width and height
                    let iindex = idx + 1;
                    let iitem =  completeArray[iindex];
                    const allItemsInContinuedSection = [ part, iitem ];
                    let continueFlag = true;
                    while(iitem.style.continued && continueFlag) {
                        if (!completeArray[iindex + 1] || completeArray[iindex].pos.y > completeArray[iindex + 1].pos.y || !completeArray[iindex + 1].content) { // Pagebreak
                            continueFlag = false;
                        } else { // Usual case
                            iindex += 1;
                            iitem = completeArray[iindex];
                            allItemsInContinuedSection.push(iitem);
                        }
                    }
                    const allRightAndBottomInfoOfSection = allItemsInContinuedSection.map(i => {
                        let _yval = i.pos.y;
                        let currentlyOnNumber = 0;
                        while (_yval > mheight) {
                           _yval -= mheight;
                        }
                        const _X = i.pos.x + pxStrip(i.style.borderLeftWidth) + pxStrip(i.style.marginLeft);
                        const lineHeight = i.style.lineHeight;
                        let lineH = null;
                        if (lineHeight === 'normal') {
                            lineH = 1.2 *  pxStrip(i.style.fontSize);
                        } else if (typeof lineHeight === 'number') {
                            lineH = lineHeight *  pxStrip(i.style.fontSize);
                        } else {
                            lineH = pxStrip(i.style.fontSize);
                        }
                        const yCorrector = pxStrip(i.style.borderTopWidth) + pxStrip(i.style.marginTop) + lineH - pxStrip(i.style.fontSize);
                        const margins = pxStrip(i.style.marginTop); // + pxStrip(i.style.marginBottom);
                        const _Y = _yval + yCorrector;
                        const iWidth = i.pos.w;
                        const iHeight = (i.pos.h + margins);
                        return { right: ((_X + iWidth) > mwidth ? mwidth : (_X + iWidth)), bottom: ((_Y + iHeight) > mheight ? mheight : (_Y + iHeight)) };
                    });
                    console.log(allItemsInContinuedSection);
                    sectionWidth = Math.max.apply(Math, allRightAndBottomInfoOfSection.map(i => i.right)) - X;
                    sectionHeight = Math.max.apply(Math, allRightAndBottomInfoOfSection.map(i => i.bottom)) - Y;
                }
                
                const settings = { align: part.style.textAlign, continued: part.style.continued };
                
                if (!lastPartWasContinuedFlag) {
                    // Width can be minimally off. Increase by 1% to not cut of words when they would have fit
                    settings.width = sectionWidth * 1.01
                    settings.height = sectionHeight * 96 / 72 * 1.01;
                    
                    doc.text(part.content || '', X, Y, settings);
                    if (part.src) {
                        const prom = toDataUrl(part.src);
                        additionalResources.push(((__X, __Y, __settings, __style, __pos, __content, picturePage) => // Preserve the vars for when the promise resolves
                            new Promise(function(res){
                                prom.then(data => {                                    
                                    doc.save(); // Save current graphics stack
                                    Object.entries(__style).forEach(([k, v], idx) => {
                                        const box = __pos;
                                        if (processAttr[k]) {
                                            const newContent = processAttr[k](doc, k, v, __content, idx, box, __style);
                                            if (newContent) __content = newContent;
                                        }
                                    });
                                    doc.switchToPage(picturePage);
                                    doc.image(data, __X, __Y, _.merge({}, __settings, { height : __pos.h })); // We need to overwrite, otherwise get the line, not the picture
                                    doc.switchToPage(currentlyOnNumber);
                                    doc.restore(); // Restore current graphics stack
                                    res();
                                });
                                prom.catch(function(e, t){
                                    res();
                                });
                            })  
                        )(X, Y, _.merge({}, settings), part.style, part.pos, part.content, currentlyOnNumber));
                    }
                } else {
                    doc.text(part.content || '', settings);
                    if (part.src) {
                        const prom = toDataUrl(part.src);
                        additionalResources.push(prom);
                        prom.then(data => {
                            doc.image(data, settings);
                        });
                    }
                }
                lastPartWasContinuedFlag = isContinued;
               
            });
            
            additionalResources.length ? Promise.all(additionalResources).then(function(){
                doc.end();  
            }) : doc.end();
        });
    });

    /*
    // draw some text
    doc.fontSize(25)
       .text('Here is some vector graphics...', 100, 80);
       
    // some vector graphics
    doc.save()
       .moveTo(100, 150)
       .lineTo(100, 250)
       .lineTo(200, 250)
       .fill("#FF3300");
       
    doc.circle(280, 200, 50)
       .fill("#6600FF");
       
    doc.circle(180, 200, 50)
       .fill("#6600FF");
       
    doc.circle(480, 200, 50)
       .fill("#6600FF");
       
    // an SVG path
    doc.scale(0.6)
       .translate(470, 130)
       .path('M 250,75 L 323,301 131,161 369,161 177,301 z')
       .fill('red', 'even-odd')
       .restore();

    const src = "data:image/png;base64,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/GMzLdsAAAAEZ0FNQQAAsY58+1GTAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAI5BSURBVHja7P1nmGTXdZ4N31WdezIGaQY5gyBIggAIMIAJDGIOEkmJpERRsmTZki3JtCTLcnptf68tv5YDLVtWosQoihTFJAYxB4AgSAAkiByInAbAYHLoVFXfj7UPu9HsmemuOrvqVPV9X1ddPfFU1T77nPPstZ+1Vq3VaiEiIiIiIoNF3SEQEREREVHoi4iIiIiIQl9ERERERBT6IiIiIiKi0BcREREREYW+iIiIiIhCX0REREREFPoiIiIiIqLQFxERERERhb6IiIiIiCj0RUREREQU+iIiIiIiotAXERERERGFvoiIiIiIKPRFREREREShLyIiIiIiCn0REREREYW+iIiIiIgo9EVERERERKEvIiIiIiIKfRERERERUeiLiIiIiCj0RUREREREoS8iIiIiIgp9ERERERFR6IuIiIiIiEJfREREREQU+iIiIiIiCn0REREREVHoi4iIiIiIQl9ERERERBT6IiIiIiKi0BcRERERUeiLiIiIiIhCX0REREREFPoiIiIiIqLQFxERERERhb6IiIiIiCj0RUREREQU+iIiIiIiotAXERERERGFvoiIiIiIKPRFREREREShLyIiIiKi0BcREREREYW+iIiIiIgo9EVERERERKEvIiIiIiIKfRERERERUeiLiIiIiCj0RUREREREoS8iIiIiIgp9ERERERFR6IuIiIiIiEJfREREREShLyIiIiIiCn0REREREVHoi4iIiIiIQl9ERERERBT6IiIiIiKi0BcRERERUeiLiIiIiIhCX0REREREFPoiIiIiIqLQFxERERERhb6IiIiIiEJfREREREQU+iIiIiIiotAXERERERGFvoiIiIiIKPRFREREREShLyIiIiKi0BcRERERkX5k2CGQXFx02b5uvt1Qms81oAHM5niT665c64kVERERhb5IJiaAUWANsAHYDByXfj0KtIBpYCa9il/vBZ4A9qfXDDCX/r5nixcXDyIiIqLQl0qQOVI/lIT8GmB9eq0BjgbOAM4GtqQ/XwdMJnE/lv5vPf1spePVkphvAPuAXcAOYDuwM/3+IeCHwB3AtpUIfxERERGFvsiPMw5sAo5JQv6o9PMk4Czg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RKEvIiIiIiIKfRERERERhb6IiIiIiCj0RUREREREoS8iIiIiIgp9ERERERFR6IuIiIiIKPRFREREREShLyIiIiIiCn0REREREVHoi4iIiIiIQl9ERERERBT6IiIiIiIKfRERERERUeiLiIiIiIhCX0REREREFPoiIiIiIqLQFxERERFR6IuIiIiIiEJfREREREQU+iIiIiIiotAXERERERGFvoiIiIiIKPRFRERERBT6IiIiIiKi0BcREREREYW+iIiIiIgo9EVERERERKEvIiIiIqLQFxERERERhb6IiIiIiCj0RUREREREoS8iIiIiIgp9ERERERFR6IuIiIiIKPRFREREREShLyIiIiIiCn0REREREVHoi4iIiIiIQl9ERERERKEvIiIiIiIKfRERERERUeiLiIiIiIhCX0REREREFPoiIiIiIqLQFxERERFR6IuIiIiIiEJfREREREQU+iIiIiIiotAXERERERGFvoiIiIiIQl9ERERERBT6IiIiIiKi0BcREREREYW+iIiIiIgo9EVERERERKEvIiIiIqLQFxERERERhb6IiIiIiCj0RUREREREoS8iIiIiIgp9ERERERGFvoiIiIiIKPRFREREREShLyIiIiIiCn0REREREemI//8AxstA1gkSOK4AAAAASUVORK5CYII=";
       
    doc.image(src, 100, 0, { width: 200 });
       
    //doc.flushPages();
    doc.end();
    */
    
    const showCaseThat = (parts) => {
       var iFrame = document.createElement('iFrame');
      document.getElementsByTagName('body')[0].appendChild(iFrame);
      iFrame.src = 'data:text/html;charset=utf-8,' + encodeURI(documentContent);
      iFrame.style.width = "595.28px";
      iFrame.style.height = " 841.89px";
      iFrame.style.display = "inline-block";
    }

    stream.on('finish', function() {
      showCaseThat(pparts);
      var iFrame = document.createElement('iFrame');
      document.getElementsByTagName('body')[0].appendChild(iFrame);
      iFrame.src = stream.toBlobURL('application/pdf');
      iFrame.type = 'application/pdf';
      iFrame.style.width = "45vw";
      iFrame.style.height = "95vh";
      iFrame.style.display = "inline-block";
    });

})(PDFDocument, blobStream);    
    




