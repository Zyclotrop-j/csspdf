import rendererStack from './rendererStack';
import drawUnit from './drawUnit';

function layout(tree) {
     if (node.text) {
        this.drawText(node.text);
    }
    root.tagName,
    var style = root.properties.style;
    node.children.forEach(this.draw);
}

class layout {
    constructor(tree, doc) {
        this.tree = tree;
        this.neg_zStack = new rendererStack();
        this.pos_zStack = new rendererStack();
        this.normalStack = new rendererStack();
        this.doc = doc;
        this.drawUnits = drawUnit(this.doc);
    }
    
    layout({ width, height }) {
        const layoutTree = this.processNode(this.tree, c => new this.drawUnits.Root({ width, height }, c), '0', 0);
        const w = layoutTree.runWidthCalculation();
        const h = layoutTree.runHeightCalculation();
        
        console.log(layoutTree);
    }
    
    _processNode(node, _parent, id, depth) {
        let parent = _parent;
        let r = null;
        const tagStyles = node.tagName;
        const style = node.properties.style;
        // ToDo: Iterate through native styles and stylesheets here
        if (node.text) {
            var tagStyles = parent.tagName;
            var style = parent.properties.style;
            return new this.drawUnits.Text(tagStyles, pos, parent);
        }
        const children = node.children.map((i, idx) => this._processNode(i, new Proxy(r, {}), `${id}-${idx}`, depth + 1));
        if (depth === 0) {
            parent = parent(children);
        }
        if (node.properties.style.display === 'block') r = new this.drawUnits.BlockBox(tagStyles, {}, children, parent, style);
        else if (node.properties.style.display === 'inline') r = new this.drawUnits.InlineBox(tagStyles, {}, children, parent, style);
        else if (node.properties.style.display.startsWith('inline')) r = new this.drawUnits.InlineBlockBox(tagStyles, {}, children, parent, style);
        
        return depth === 0 ? parent : r;
         
    }
}

export default layout;