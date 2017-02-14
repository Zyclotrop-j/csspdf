import _ from 'lodash';
import expandStyles from './expandStyles';

function init (pdfDocument){
    
    class drawUnit {
      constructor(type, pos, children, parent) {
        this.TYPE = type;
        this.children = children || (type === Text.TYPE ? null : []);
        this.parent = parent;
        this.pos = pos,
        this._style = {
            maxWidth: Infinity,
            minWidth: 0,
            margin: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            },
            padding: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            },
            border: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            },
            heigth: 'auto',
            width: 'auto',
        };
      }
      get styles() {
          return this._style;
      }
      set styles (style) {
          this._style = {
              ...this._style,
              ...expandStyles(style)
          };
          return style;
      }
    }

    const textClass = 'TEXT';
    const boxClass = 'ABSTRACTBOX';
    const inlineBox = 'INLINE';
    const blockBox = 'BLOCK';
    const inlineblockBox = 'INLINEBLOCK';
    
    class Root extends drawUnit {
        constructor({ width, height }, children) {
            super(Root.TYPE, { x: 0, y: 0 }, children, null);
            this.styles = { width, height, };
        }
        static get TYPE() { return 'ROOT'; }
        
        calculateWidth() {
            this.calculatedWidth = this.styles.width; // No padding / margin here!
            return this.calculatedWidth;
        }
        
        calculateHeight() {
            this.calculatedHeight = this.styles.height; // No padding / margin here!
            return this.calculatedHeight;
        }
        
        calculateOptWidth() {
            return this.styles.width;
        }
        
        calculateOptHeight() {
            return this.styles.height;
        }
        
        calcMinWidth () {
            return this.styles.width;
        }
        
        calcMinHeight () {
            return this.styles.height;
        }
        
        runWidthCalculation() {
            const recurse = node => {
                const w = node.boxWidth;
                const widthes = node.children.map(i => recurse(i));
                return widthes.concat([w]);
            };
            return recurse(this);
        }
        
        runHeightCalculation() {
            const h = node.boxHeight;
            this.children.forEach(i => i.boxHeight);
            return h;
        }
        
        get boxWidth () {
            return this.calculateWidth();
        }
        get boxHeight() {
            return this.calculateHeight();
        }
        
        
    }

    class Text extends drawUnit {
        constructor(text, pos, parent) {
            super(textClass, pos, null, parent);
            this.text = text;
        }
        static get TYPE() { return textClass; }
        
        calculateWidth () {
            const optWidth = this.calculateOptWidth();
            const maxWidth = this.parent.calculatedWidth;
            this.calculatedWidth = optWidth < maxWidth ? optWidth : maxWidth;
            return this.calculatedWidth;
        }
        
        get boxWidth() {
            return this.calculateWidth();
        }
        get boxHeight() {
            return this.calculateHeight();
        }
        
        calculateOptWidth(text = this.text) {
            // ToDo: Apply styles to string before measure
            return pdfDocument.widthOfString(text);
        }
        
        calcMinWidth (text = this.text) {
            // ToDo: Apply styles to string before measure
            const allMinWidths = text.split(' ').map(i => pdfDocument.widthOfString(i));
            return Math.min(...allMinWidths);
        }
        
        calculateOptHeight(text = this.text) {
            // ToDo: Apply styles to string before measure
            return pdfDocument.currentLineHeight();
        }
        
        calculateHeight() {
            // ToDo: Apply styles to string before measure
            const lineHeight = pdfDocument.currentLineHeight();
            const childDims = text.split(' ').map(i => [pdfDocument.widthOfString(i),lineHeight]);
            const oneLineWidth = this.parent.calculatedWidth;
            let currentWidthTaken = 0;
            let rowHeights = [];
            let h = childDims.reduce((p, i) => {
                const thatWidth = i[0];
                const thatHeight = i[1];
                if (currentWidthTaken + thatWidth > oneLineWidth) {
                    // BreakLine
                    // Of all heights in this line, take tallest
                    const n = p + Math.max(...rowHeights);
                    // Reset heights in line
                    rowHeights = [thatHeight];
                    // In new line, there's only the current item, as it is a new line
                    currentWidthTaken = thatWidth;
                    return n;
                }
                // New item fits in current line, add it
                currentWidthTaken += thatWidth;
                // Add item's height to the line's array of heights
                rowHeights.push(thatHeight);
                return p;
            }, 0);
            // Don't forget last line
            h += Math.max(...rowHeights);
            this.calucaltedHeight = h;
            return h;
        }
    }

    class Box extends drawUnit {
        constructor(tag, type, pos, children, parent, style) {
            super(type || boxClass, pos, children, parent);
            this._tag = tag;
            this.styles = style;
        }
        static get TYPE() { return boxClass; }
        
        shrinkToFitWidth() {
            /*
            Calculate the preferred width by formatting the content without breaking lines other than where explicit line breaks occur
            Also calculate the preferred minimum width, e.g., by trying all possible line breaks. CSS 2.1 does not define the exact algorithm.
            Find the available width: in this case, this is the width of the containing block minus the used values of margin-left,  border-left-width, padding-left, padding-right,  border-right-width, margin-right, and the widths of any relevant scroll bars.
            Then the shrink-to-fit width is:
            min(max(preferred minimum width, available width), preferred width)
            */
           const preferredWidth = this.calculateOptWidth();
           const minWidth = Math.min(...this.children.map(i => i.calcMinWidth()));
           const availWidth = this.parent.calculatedWidth - (
                this.styles.margin.left +
                this.styles.margin.right +
                this.styles.border.left +
                this.styles.border.right +
                this.styles.padding.left +
                this.styles.padding.right);
            return Math.min(Math.max(minWidth, availWidth), preferredWidth);
            
        }
        
        get isReplacedElement () {
            return this._isReplacedElement;
            //const replacedElements = ['img', 'object', 'canvas', 'video', 'input', 'textarea', 'select'];
            //return replacedElements[this._tag] > -1;
        }
        
        // Call for image, ...
        setReplacement (data, { width, height, ratio = 1 }) {
            this._isReplacedElement = true;
            this.replacement = {
                data,
                width || height * ratio,
                height || width / ratio,
            };
        }
        
        get boxWidth() {
            /*
            The tentative used width is calculated (without 'min-width' and 'max-width') following the rules under "Calculating widths and margins" above.
            If the tentative used width is greater than 'max-width', the rules above are applied again, but this time using the computed value of 'max-width' as the computed value for 'width'.
            If the resulting width is smaller than 'min-width', the rules above are applied again, but this time using the value of 'min-width' as the computed value for 'width'.
            */
            let w = this.calculateWidth();
            if (w > this.styles.maxWidth) {
                w = this.calculateWidth(this.styles.maxWidth);
            }
            if (w < this.styles.minWidth) {
                w = this.calculateWidth(this.styles.minWidth);
            }
            return w;
        }
        
        get boxHeight() {
            let w = this.calculateHeight();
            if (w > this.styles.maxHeight) {
                w = this.calculateWidth(this.styles.maxHeight);
            }
            if (w < this.styles.minHeight) {
                w = this.calculateWidth(this.styles.minHeight);
            }
            return w;
        }
    }

    class InlineBox extends drawUnit {
        constructor(tag, pos, children, parent, style) {
            super(tag, inlineBox, pos, children, parent, style);

        }
        static get TYPE() { return inlineBox; }
        
        calculateWidth (ww = this.styles.width) {
            // Both cases
            if (this.styles.margin.left === 'auto') {
                this.margin.left = 0;
            }
            if (this.styles.margin.right === 'auto') {
                this.margin.right = 0;
            }
            
            if (this.isReplacedElement) {
                // Use intrinsic dimentions
                if (ww === 'auto' || !this.styles.width) {
                    this.calculatedWidth = this.replacement.width;
                } else {
                    // Actually in spec... 
                    this.calculateWidth = 300; // ToDo: convert from px
                }
                return this.calculatedWidth;
            }
            // The 'width' property does not apply. A computed value of 'auto' for 'margin-left' or 'margin-right' becomes a used value of '0'.
            
            // When drawing flow into multiple lines
            // Also, when float are present, reduce calculatedWidth
            this.calculatedWidth = this.parent.calculatedWidth;
            return this.calculatedWidth;
        }
        
        calculateHeight() {
            const totalWidth = this.calculateOptWidth();
            const takesWidth = this.calculatedWidth;
            const childDims = this.children.map(i => [i.calculatedWidth, i.calculateHeight()]);
            this.margin.top = this.style.margin.top === 'auto' ? 0 : this.style.margin.top;
            this.margin.bottom = this.style.margin.bottom === 'auto' ? 0 : this.style.margin.bottom;
            let currentWidthTaken = 0;
            let rowHeights = [];
            let h = childDims.reduce((p, i) => {
                const thatWidth = i[0];
                const thatHeight = i[1];
                if (currentWidthTaken + thatWidth > takesWidth) {
                    // BreakLine
                    // Of all heights in this line, take tallest
                    const n = p + Math.max(...rowHeights);
                    // Reset heights in line
                    rowHeights = [thatHeight];
                    // In new line, there's only the current item, as it is a new line
                    currentWidthTaken = thatWidth;
                    return n;
                }
                // New item fits in current line, add it
                currentWidthTaken += thatWidth;
                // Add item's height to the line's array of heights
                rowHeights.push(thatHeight);
                return p;
            }, 0);
            // DOn't forget last line
            h += Math.max(...rowHeights);
            this.calucaltedHeight = h + this.margin.bottom + this.margin.top + this.styles.padding.bottom + this.styles.padding.top + this.styles.border.bottom + this.styles.border.top;
            return this.calucaltedHeight;
        }
        
        calculateOptHeight () { 
            return Math.max(...this.children.map(i => i.calculateOptHeight())) + f0a(this.styles.margin.top) + f0a(this.styles.margin.bottom) + f0a(this.styles.padding.top) + f0a(this.styles.padding.bottom) + f0a(this.styles.border.top) + f0a(this.styles.border.bottom);
        }
        
        calcMinWidth() {
            const f0a = i => (i === 'auto' ? 0 : i);
            const ml = this.styles.margin.left;
            const mr = this.styles.margin.right;
            const pl = this.styles.padding.left;
            const pr = this.styles.padding.right;
            const bl = this.styles.border.left;
            const br = this.styles.border.right;
             const all = [ml, mr, pl, pr, bl, br];
            if (this.isReplacedElement) {
                return all.reduce((p, i) => p+f0a(i), ((this.styles.width === 'auto' || !this.styles.width) ? this.replacement.width : 300));
            }
            return all.reduce((p, i) => p+f0a(i), 0) + Math.min(...this.children.map(i => i.calcMinWidth()));
        }
        
        calculateOptWidth() {
            let f = this.children.reduce(c => c.calculateOptWidth());
            if (f > this.styles.maxWidth && this.isReplacedElement) f = this.styles.maxWidth;
            if (f < this.styles.minWidth && this.isReplacedElement) f = this.styles.minWidth;
            return
                this.styles.margin.left +
                this.styles.margin.right +
                this.styles.border.left +
                this.styles.border.right +
                this.styles.padding.left +
                this.styles.padding.right +
                f;
        }
    }

    class BlockBox extends drawUnit {
        constructor(tag, pos, children, parent, style) {
            super(tag, blockBox, pos, children, parent, style);
        }
        static get TYPE() { return blockBox; }
        
        calculateWidth (ww = this.styles.width) {
            const f0a = i => (i === 'auto' ? 0 : i);
            let width = ww;
            let ml = this.styles.margin.left;
            let mr = this.styles.margin.right;
            let pl = this.styles.padding.left;
            let pr = this.styles.padding.right;
            let bl = this.styles.border.left;
            let br = this.styles.border.right;
            const all = [ml, mr, pl, pr, bl, br];
            
            if (this.isReplacedElement) {
                if (ww === 'auto') {
                    this.calculatedWidth = this.replacement.width;
                } else {
                    // Actually in spec... 
                    this.calculateWidth = 300; // ToDo: convert from px
                }
                if (all.reduce((p, i) => p+f0a(i), width) > this.parent.calculatedWidth) {
                    if (ml === 'auto') ml = 0;
                    if (mr === 'auto') mr = 0;
                }
                if (ml === 'auto' && mr === 'auto') {
                    ml = (this.parent.calculatedWidth - bl - br - pl - pr - this.calculateWidth) / 2;
                    mr = ml;
                }
                else if (ml === 'auto') {
                    ml = this.parent.calculatedWidth - bl - br - pl - pr - this.calculateWidth - mr;
                }
                else if (mr === 'auto') {
                    mr = this.parent.calculatedWidth - bl - br - pl - pr - this.calculateWidth - ml;
                }
                this.margin.left = ml;
                this.margin.right = mr;
                return this.calculatedWidth;
            }
            // 'margin-left' + 'border-left-width' + 'padding-left' + 'width' + 'padding-right' + 'border-right-width' + 'margin-right' = width of containing block
            if (width !== 'auto' && all.reduce((p, i) => p+f0a(i), width) > this.parent.calculatedWidth) {
                if (ml === 'auto') ml = 0;
                if (mr === 'auto') mr = 0;
            }
            if (width !== 'auto' && mr !== 'auto' && ml !== 'auto' && all.reduce((p, i) => p+f0a(i), width) > this.parent.calculatedWidth) {
                // assume ltr
                mr = this.parent.calculatedWidth - bl - br - width - pl - pr - ml;
            }
            else if (width === 'auto') {
                if (ml === 'auto') ml = 0;
                if (mr === 'auto') mr = 0;
                width = this.parent.calculatedWidth - bl - br - pl - pr - ml - mr;
            }
            else if (ml === 'auto' && mr === 'auto') {
                ml = (this.parent.calculatedWidth - bl - br - pl - pr - width) / 2;
                mr = ml;
            }
            else if (ml === 'auto') {
                ml = this.parent.calculatedWidth - bl - br - pl - pr - width - mr;
            }
            else if (mr === 'auto') {
                mr = this.parent.calculatedWidth - bl - br - pl - pr - width - ml;
            }
            else {
                width = all.reduce((p, i) => p+f0a(i), 0) + width;
            }
            this.calculatedWidth = width;
            this.margin.left = ml;
            this.margin.right = mr;
            return this.calculatedWidth;
        }
        
        calculateOptHeight () {
            const f0a = t => (t === 'auto' ? 0 : t);
            return Math.max(...this.children.map(i => i.calculateOptHeight())) + f0a(this.styles.margin.top) + f0a(this.styles.margin.bottom) + f0a(this.styles.padding.top) + f0a(this.styles.padding.bottom) + f0a(this.styles.border.top) + f0a(this.styles.border.bottom);
        }
        
        calculateHeight (h = this.styles.height) {
            this.margin.top = this.style.margin.top === 'auto' ? 0 : this.style.margin.top;
            this.margin.bottom = this.style.margin.bottom === 'auto' ? 0 : this.style.margin.bottom;
            if (this.styles.height !== 'auto') {
                this.calucaltedHeight = h + this.margin.bottom + this.margin.top + this.styles.padding.bottom + this.styles.padding.top + this.styles.border.bottom + this.styles.border.top;
                return this.calucaltedHeight;
            }
            const totalWidth = this.calculateOptWidth();
            const takesWidth = this.calculatedWidth;
            const childDims = this.children.map(i => [i.calculatedWidth, i.calculateHeight()]);
            let currentWidthTaken = 0;
            let rowHeights = [];
            h = childDims.reduce((p, i) => {
                const thatWidth = i[0];
                const thatHeight = i[1];
                if (currentWidthTaken + thatWidth > takesWidth) {
                    // BreakLine
                    // Of all heights in this line, take tallest
                    const n = p + Math.max(...rowHeights);
                    // Reset heights in line
                    rowHeights = [thatHeight];
                    // In new line, there's only the current item, as it is a new line
                    currentWidthTaken = thatWidth;
                    return n;
                }
                // New item fits in current line, add it
                currentWidthTaken += thatWidth;
                // Add item's height to the line's array of heights
                rowHeights.push(thatHeight);
                return p;
            }, 0);
            // DOn't forget last line
            h += Math.max(...rowHeights);
            this.calucaltedHeight = h;
            return h + this.margin.bottom + this.margin.top + this.styles.padding.bottom + this.styles.padding.top + this.styles.border.bottom + this.styles.border.top;
        }
        
        calcMinWidth() {
            const f0a = i => (i === 'auto' ? 0 : i);
            const width = this.styles.width;
            const ml = this.styles.margin.left;
            const mr = this.styles.margin.right;
            const pl = this.styles.padding.left;
            const pr = this.styles.padding.right;
            const bl = this.styles.border.left;
            const br = this.styles.border.right;
            const all = [ml, mr, pl, pr, bl, br];
            if (this.isReplacedElement) {
                return all.reduce((p, i) => p+f0a(i), ((this.styles.width === 'auto' || !this.styles.width) ? this.replacement.width : 300));
            }
            return all.reduce((p, i) => p+f0a(i), (width || Math.min(...this.children.map(i => i.calcMinWidth()))));
        }
        
        calculateOptWidth () {
            let f = this.style.width ||
                    this.children.reduce(c => c.calculateOptWidth())
            if (f > this.styles.maxWidth) f = this.styles.maxWidth;
            if (f < this.styles.minWidth) f = this.styles.minWidth;
            return
                this.styles.margin.left +
                this.styles.margin.right +
                this.styles.border.left +
                this.styles.border.right +
                this.styles.padding.left +
                this.styles.padding.right +
                f;
        }
    }

    class InlineBlockBox extends drawUnit {
        constructor(tag, pos, children, parent, style) {
            super(tag, inlineblockBox, pos, children, parent, style);
        }
        static get TYPE() { return inlineblockBox; }
        
        calculateWidth (ww = this.styles.width) {
            if (this.isReplacedElement) {
                if (this.styles.margin.left === 'auto') {
                    this.margin.left = 0;
                }
                if (this.styles.margin.right === 'auto') {
                    this.margin.right = 0;
                }
                // Use intrinsic dimentions
                if (ww === 'auto' || !ww) {
                    this.calculatedWidth = this.replacement.width;
                } else {
                    // Actually in spec... 
                    this.calculateWidth = 300; // ToDo: convert from px
                }
                return this.calculatedWidth;
            }
            //If 'width' is 'auto', the used value is the shrink-to-fit width as for floating elements.
            //A computed value of 'auto' for 'margin-left' or 'margin-right' becomes a used value of '0'.
            if (ww === 'auto') {
                this.calculatedWidth = this.shrinkToFitWidth();
                
            } else {
                this.calculatedWidth = ww;
            }
            this.margin.left = this.styles.margin.left === 'auto' ? 0 : this.styles.margin.left;
            this.margin.right = this.styles.margin.right === 'auto' ? 0 : this.styles.margin.right;
            return this.calculatedWidth;  
        }
        
        calculateOptHeight () {
            const f0a = t => (t === 'auto' ? 0 : t);
            return Math.max(...this.children.map(i => i.calculateOptHeight())) + f0a(this.styles.margin.top) + f0a(this.styles.margin.bottom) + f0a(this.styles.padding.top) + f0a(this.styles.padding.bottom) + f0a(this.styles.border.top) + f0a(this.styles.border.bottom);
        }
        
       calculateHeight (h = this.styles.height) {
            this.margin.top = this.style.margin.top === 'auto' ? 0 : this.style.margin.top;
            this.margin.bottom = this.style.margin.bottom === 'auto' ? 0 : this.style.margin.bottom;
            if (this.styles.height !== 'auto') {
                this.calucaltedHeight = h + this.margin.bottom + this.margin.top + this.styles.padding.bottom + this.styles.padding.top + this.styles.border.bottom + this.styles.border.top;
                return this.calucaltedHeight;
            }
            const totalWidth = this.calculateOptWidth();
            const takesWidth = this.calculatedWidth;
            const childDims = this.children.map(i => [i.calculatedWidth, i.calculateHeight()]);
            let currentWidthTaken = 0;
            let rowHeights = [];
            h = childDims.reduce((p, i) => {
                const thatWidth = i[0];
                const thatHeight = i[1];
                if (currentWidthTaken + thatWidth > takesWidth) {
                    // BreakLine
                    // Of all heights in this line, take tallest
                    const n = p + Math.max(...rowHeights);
                    // Reset heights in line
                    rowHeights = [thatHeight];
                    // In new line, there's only the current item, as it is a new line
                    currentWidthTaken = thatWidth;
                    return n;
                }
                // New item fits in current line, add it
                currentWidthTaken += thatWidth;
                // Add item's height to the line's array of heights
                rowHeights.push(thatHeight);
                return p;
            }, 0);
            // DOn't forget last line
            h += Math.max(...rowHeights);
            this.calucaltedHeight = h;
            return h + this.margin.bottom + this.margin.top + this.styles.padding.bottom + this.styles.padding.top + this.styles.border.bottom + this.styles.border.top;
        }
        
        calculateOptWidth () {
            let f = this.styles.width ||
                    this.children.reduce(c => c.calculateOptWidth())
            if (f > this.styles.maxWidth) f = this.styles.maxWidth;
            if (f < this.styles.minWidth) f = this.styles.minWidth;
            return
                this.styles.margin.left +
                this.styles.margin.right +
                this.styles.border.left +
                this.styles.border.right +
                this.styles.padding.left +
                this.styles.padding.right +
                f;
        }
    }
    
    return {
        InlineBlockBox,
        BlockBox,
        InlineBox,
        Text,
        Root,
    };
}

export default init;









