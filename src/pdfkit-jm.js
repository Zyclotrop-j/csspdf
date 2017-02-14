function getStack() {
    var stack = new Proxy([], {
        get: function(target, name){
            return target[name] || {
                top: target[target.length] || {},
                bottom: target[0] || {}
            }[name];
        },
        set: function (oTarget, sKey, vValue) {
            if (!oTarget[sKey]) {
                var t = {
                    top: oTarget[oTarget.length],
                    bottom: oTarget[0]
                }[sKey];
                return (t = vValue);
            }
            return oTarget[sKey] = vValue;
        },
    });
    return stack;
}


(function(PDFConstructor, stream){
    // create a document and pipe to a blob
var doc = new PDFConstructor({
     size: 'A4', //A4: [595.28, 841.89]
     margins : { // by default, all are 72
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
});
var stream = doc.pipe(stream());

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
   
// an SVG path
doc.scale(0.6)
   .translate(470, 130)
   .path('M 250,75 L 323,301 131,161 369,161 177,301 z')
   .fill('red', 'even-odd')
   .restore();
   
// and some justified text wrapped into columns
doc.text('And here is some wrapped text...', 100, 300)
   .font('Times-Roman', 13)
   .moveDown()
   .text('foo', {
     width: 412,
     align: 'justify',
     indent: 30,
     columns: 2,
     height: 300,
     ellipsis: true
   });

function json2Pdf(doc, meta) {
    this.doc = doc;
     this.meta = meta;
    this.containers = getStack();
    this.containers.push(this.meta.size),
    this.pos = {
      x : 0,
      y: 0,
      page: 0,
    };
}

json2Pdf.prototype.renderTree = function(root) {
    
    
};
json2Pdf.prototype.draw = function(node) {
    if (node.text) {
        this.drawText(node.text);
    }
    root.tagName,
    var style = root.properties.style;
    node.children.forEach(this.draw);
};
json2Pdf.prototype.drawText = function(text) {
    
};

// Test
var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');

function createTree()  {
    return h('div', {
        style: {
            textAlign: 'center',
            border: '1px solid red',
            width: '90px',
            height: '100px'
        }
    }, [
      h('div', {
    	}, ['Test', 'Foo']),
      h('div', {
        style: {
            width: '90px',
            height: '100px'
        }
    	}, ['Test'])]);
}
var tree = createTree();
var div = document.createElement('pre');
div.innerText = JSON.stringify(tree, null, 2);
document.body.appendChild(div);
// End test


json2Pdf.prototype.write = function(text, style){
    this.doc.text(text, {
        x: this.pos.x,
        y: this.pos.y,
        width: this.containers.top.width,
        height: this.containers.top.height,
        ...transform(style),
        continued: true // kept for second text call
    });
    return this;
}

var advDoc = new json2Pdf(doc, {
    size: {width: 595.28, height: 841.89}
});
advDoc.write('foobar asdlf  asdlkkj asj sdjkasd jkjk; asdjiasdj jk sdafjo; sadf ji;jk; sdfjk;sda jk; sdfajk;sdf jk;jk;sdf j; sdaj;o sfaojfsd ojp');
advDoc.write('foobar asdlf  asdlkkj asj sdjkasd jkjk; asdjiasdj jk sdafjo; sadf ji;jk; sdfjk;sda jk; sdfajk;sdf jk;jk;sdf j; sdaj;o sfaojfsd ojp');

var styleMapper = {
  'text-align': [function(){return 'align';}, function(set){
      if(['left', 'right', 'center', 'justify'].indexOf(set) > -1) return set;
      throw new Error('Invalid value '+set);
  }],
  'white-space': [function(){return 'lineBreak';},function(set){
      if (['normal', 'pre-line', 'pre-wrap'].indexOf(set) > -1) return true;
      if (['nowrap', 'pre'].indexOf(set) > -1) return false;
      throw new Error('Invalid value '+set);
  }, function(set, val){
      if (['normal', 'nowrap'].indexOf(set) > -1) return val.replace(/\s|\n|\r/g, '');
      if (['pre-line'].indexOf(set) > -1)  return val.replace(/\s/g, '');
  }],
  'text-overflow': [function(){return '';},function(set){return '';}, function(set, val){
      var that = this;
      var shorten = function(baseString){return _.dropRightWhile(baseString.split(''), function(i){return that.doc.widthOfString(i) <= that.containers.top.width}).join('');};
      if ('clip' === set) return shorten(val);
      if ('ellipsis' === set)  return shorten('...'+val).subString(3) + '...';
      if (typeof set === 'string')  return shorten(set+val).subString(3) + set;
      return val;
  }],
  'text-indent': [function(){return 'indent';}, function(set){
    var number = _.toNumber(set);
    if (_.isNumber(number)) return number;
    var parts = number.match(/(\d*\.?\d*)(.*)/);
    throw new Error('Not implemented handling '+set);
   }],
   'font-height': [function(){return 'lineGap';}, function(set){
    var number = _.toNumber(set);
    if (_.isNumber(number)) return number;
    var parts = number.match(/(\d*\.?\d*)(.*)/);
    throw new Error('Not implemented handling '+set);
   }],
    'word-spacing': [function(){return 'wordSpacing';}, function(set){
        if (set === 'normal') return undefined;
        var number = _.toNumber(set);
        if (_.isNumber(number)) return number;
        var parts = number.match(/(\d*\.?\d*)(.*)/);
        throw new Error('Not implemented handling '+set);
    }],
    'letter-spacing': [function(){return 'characterSpacing';}, function(set){
        if (set === 'normal') return undefined;
        var number = _.toNumber(set);
        if (_.isNumber(number)) return number;
        var parts = number.match(/(\d*\.?\d*)(.*)/);
        throw new Error('Not implemented handling '+set);
    }],
     'color': [function(){return 'fillColor';}, function(set){
        return convertColor(set);
        throw new Error('Not implemented handling '+set);
    }],
    text-decoration: underline
    
    link
    
};

function handleCSSStyle(attr, set, text) {
    return {
        style: {
            wordSpacing: set1,
            fillColor: set2,
        },
        text: newText,
        addDraw: function(){ do stuff, e.g. draw line for underline },
        modifyStack: function() { modify context, e.g. by updating the current container, the current pos, ... },
    };
}

   
//doc.flushPages();
doc.end();
stream.on('finish', function() {
  var iFrame = document.createElement('iFrame');
  document.getElementsByTagName('body')[0].appendChild(iFrame);
  iFrame.src = stream.toBlobURL('application/pdf');
  iFrame.type = 'application/pdf';
  iFrame.style.width = "95vw";
  iFrame.style.height = "95vh";
});
    
    
})(window.PDFDocument, window.blobStream);