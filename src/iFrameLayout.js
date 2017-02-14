import globalStylesToTakeOver from './stylesToTakeOver'; 

export default function(HTMLcontent, complete, notify, log, gSettings, _stylesToTakeOver){
    var stylesToTakeOver = _stylesToTakeOver || globalStylesToTakeOver;
    const measureHTML = `function* measureHTML(msg, throttle) {
        function staticStyles(style) {
        var dest = {};
        dest = stylesToTakeOver.reduce(function(p, i){
            var prop = i.replace(/([A-Z])/g, '-$1').toLowerCase().trim();
          p[i] = style.getPropertyValue(prop) || style[prop];
          return p;
        }, dest);
        return dest;
      }
      function getPosition(el) {
        var boundingRect = el.getBoundingClientRect();
        return {
          x: boundingRect.left,
          y: boundingRect.top,
          w: boundingRect.width,
          h: boundingRect.height,
        };
        
        // Legacy - getBoundingClientRect gives different values for inlines
        var xPos = 0;
        var yPos = 0;
        var w = el.offsetWidth;
        var h = el.offsetHeight;

        while (el) {
          if (el.tagName == 'BODY') {
            // deal with browser quirks with body/window/document and page scroll
            var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
            var yScroll = el.scrollTop || document.documentElement.scrollTop;

            xPos += (el.offsetLeft - xScroll + el.clientLeft);
            yPos += (el.offsetTop - yScroll + el.clientTop);
          } else {
            // for all other non-BODY elements
            xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
            yPos += (el.offsetTop - el.scrollTop + el.clientTop);
          }

          el = el.offsetParent;
        }
        return {
          x: xPos,
          y: yPos,
          w: w,
          h: h,
        };
      }
      function psdeudoProcessFactory() {
        function camelize(a, b) {
              return b.toUpperCase();
          }
        function processPseudo(el, pseudo) {
          var style = window.getComputedStyle(
              el, ':'+pseudo
          );
          if (!style.getPropertyValue('content')) return false;
          var dest = {};
          var persist = {};
          persist.getPropertyValue = function(i){
              return persist[i];
          };
          if (style.length) {
               for (var i = 0, l = style.length; i < l; i++) {
                   prop = style[i];
                   camel = prop.replace(/\-([a-z])/g, camelize);
                   val = style.getPropertyValue(prop);
                   dest[camel] = val;
                   persist[prop] = val;
               }
           } else {
               for (prop in style) {
                   camel = prop.replace(/\-([a-z])/g, camelize);
                   val = style.getPropertyValue(prop) || style[prop];
                   dest[camel] = val;
                   persist[prop] = val;
               }
           }
          const content = style.getPropertyValue('content').slice(1, -1);
          var span = document.createElement('span');
          Object.entries(dest).forEach(function([k,v]) {
            span.style[k] = v;
          });
          span.textContent = !content ? ' ' : content;
          el.appendChild(span);
          var tmppos = getPosition(span);
          var tmpxpos = tmppos.x;
          // If psdeudo is before and elements elemnts take space (position !== absolute and position !== fixed)
          // Then reduce x-pos by space taken by before element (= element taken by replacement span)
          if (pseudo.toLowerCase() === 'before') {
            tmpxpos = (persist.getPropertyValue('position') === 'absolute' || persist.getPropertyValue('position') === 'fixed') ? tmppos.x : tmppos.x - tmppos.w;
          }
          var pos = {
              x: tmpxpos,
              y: tmppos.y,
              w: tmppos.w,
              h: tmppos.h,
          };
          el.removeChild(span);
          
          if (pos.w <= 0 || pos.h <= 0) return false; // Don't draw items that take no space
          
          return {
            pos: pos,
            style: persist,
            content: !!content.trim() ? content.trim() : content,
            type: pseudo,
          };
        };
        return processPseudo;
      }


      var elements = ["a","abbr","acronym","address","applet","area","article","aside","b","bdi","bdo", "big","blockquote","body","br","button","canvas","caption","center","cite","code", "col","colgroup","datalist","dd","del","details","dfn","dialog","dir","div", "dl","dt","em","embed","fieldset","figcaption","figure","font","footer", "form","h1","h2","h3","h4","h5","h6","header","hr","i","img","input","ins","kbd","keygen", "label","legend","li","link","main","map","mark","menu","menuitem","meta","meter","nav", "object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp", "rt","ruby","s","samp","section","select","small","source","span","strike","strong", "sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","title","tr", "tt","u","ul","var","video","wbr"];
      var allEles = document.querySelectorAll('body,'+elements.map(function(i){return 'body '+i}).join(','));
      msg({ cause: 'PROGRESS', data: { percent: 0, stage: 0 }});
      yield;

      var parts = [];
      var ppseudo = psdeudoProcessFactory();
      for (var i = 0; i < allEles.length; ++i) {
        if ((i % throttle) === 0) {
            msg({ cause: 'PROGRESS', data: { percent: i/allEles.length/2, stage: 1 } });
          yield;
        }
            
        var item = allEles[i];
        item.normalize();
        var children =  Array.prototype.slice.call(item.childNodes);
        if (children.length <= 1) continue;
        var texts = children.filter(function(child) {
          return !!child.nodeValue && child.nodeValue;
        });
        texts.forEach(function(textNode, idx){
          var span = document.createElement('span');
          span.appendChild( document.createTextNode(textNode.nodeValue));
          span.dataset.replacement = 'REPLACEMENT';
          item.replaceChild(span, textNode);
        });
      }
      yield;
      let afterElement = null; // Fixme: Rendering order is not proper
      allEles = document.querySelectorAll('body,'+elements.map(function(i){return 'body '+i}).join(',')); // Refresh to include spans
      for (var i = 0; i < allEles.length; ++i) {
        var item = allEles[i];
        var pos = getPosition(item);
        var style = window.getComputedStyle(item, null);
        style.continued = false;
        var children = item.childNodes;
        
        // if (!item.childNodes.length && !item.src && !item.getAttribute("src")) continue; // Could have before and after - hence can't user perf tweak :(
        if (style.display === 'none') continue;
        if (item.offsetWidth <= 0 && item.offsetHeight <= 0) continue; // invisible
        if (item.style.backfaceVisibility === 'hidden' && (item.style.transform.indexOf('rotateY(180deg)') > -1 || item.style.transform.indexOf('rotateX(180deg)') > -1 || item.style.transform.indexOf('rotateZ(180deg)') > -1)) continue;
        if (pos.w <= 0 || pos.h <= 0) continue; // Don't draw items that take no space
        
        var value = item.childNodes && item.childNodes[0] && item.childNodes[0].nodeValue;
        
        if (item.nextSibling && item.nextSibling === allEles[i + 1]) {
            // Inline contents run-in display
            var displayValue = window.getComputedStyle(allEles[i + 1], null).getPropertyValue('display') || '';
            if (displayValue.toLowerCase() === 'contents' ||
                displayValue.toLowerCase() === 'run-in' ||
                displayValue.toLowerCase().indexOf('inline') > -1) {
                    style.continued = true;
                }
        }
        
        parts.push({
          pos: pos,
          style: style,
          content: value && value.trim ? value : null,
          src: item.src || item.getAttribute("src"),
          type: item.tagName
        }); 
        
        if (afterElement) parts.push(afterElement); // Defered until text was actully pushed
        var before = ppseudo(item, 'before');
        if (before) parts.push(before);
        var after = ppseudo(item, 'after');
        afterElement = after;
        
        if (after) parts.push(after);
        if ((i % throttle) === 0) {
            msg({ cause: 'PROGRESS', data: { percent: i/allEles.length/2 + 0.5, stage: 2 } });
          yield;
        }
      }
      if (afterElement) parts.push(afterElement);
      var mdata = parts.map(function(i){
          return {
            pos: i.pos,
            style: staticStyles(i.style),
            content: i.content,
            type: i.type,
            src: i.src,
          };
        });
      msg({ cause: 'PROGRESS', data: { percent: 100, stage: 2 } });
      yield;
      return {
        cause: 'DONE',
        data: mdata
      };
    }`

    var content = HTMLcontent;
    const asyncRecurse = `function asyncRecurse(generator, f, wait) {
        window.setTimeout(function(){
        var tmp = generator.next();
        if (tmp.done) { return f(tmp.value); }
        else if (tmp.then) { return tmp.then(function(){ asyncRecurse(generator, f, wait); }); }
        asyncRecurse(generator, f, wait);
      }, wait);
    }`;

    var sc = ["<"+"script"+">",
    "var stylesToTakeOver = "+JSON.stringify(stylesToTakeOver), ";",
    measureHTML, "; ", asyncRecurse, "; ",
    "window.addEventListener('message', function(event){",
    "function postMsg(data){event.source.postMessage(data, '*');};",
    "var measurementGenerator = measureHTML(postMsg, event.data.throttle);",
    "asyncRecurse(measurementGenerator, postMsg, event.data.wait);",
    "}, false);",
    "window.parent.postMessage({ cause: 'READY' }, '*')",
    "</"+"script"+">"].join('');

    content = content.replace('</body>', sc+'</body>');

    var iFrame = document.createElement('iFrame');
    var iFrameRoot = document.querySelector('body');
    iFrame.style.position = 'absolute';
    // A4: [595.28, 841.89]
    const conversionRatio =  1;
    iFrame.style.width = (595.28 * conversionRatio) + 'px';
    iFrame.style.height = (841.89 * conversionRatio) + 'px';
    iFrame.style.left = '-10000px';
    iFrame.src = 'data:text/html;charset=utf-8,' + encodeURI(content);
    iFrame.sandbox = 'allow-scripts';

    const prom = new Promise((res, rej) => {
        window.addEventListener('message', function(event){
          if (event.data.cause === 'READY') {
            notify && notify(event.data);
            return iFrame.contentWindow.postMessage(Object.assign({ throttle: 100, wait: 10 }, gSettings), '*');
          }
          if (event.data.cause === 'PROGRESS') {
            return notify && notify(event.data);
          }
          if (event.data.cause !== 'DONE') {
            console.warn('Got unknown message', event.data);
            return;
          }
          var parts = event.data.data;
          complete(parts);
          res(parts);
        });
    });

    iFrameRoot.appendChild(iFrame);
    
    return prom;

}