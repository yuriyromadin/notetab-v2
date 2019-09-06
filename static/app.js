class LocalStorage {
  constructor(prefix='BS_'){
    this.prefix = `notetab.${prefix}`;
  }

  set(obj, callback) {
    let value = JSON.stringify(obj);

    localStorage.setItem(this.prefix, value);
    if(typeof callback === 'function'){
      callback();
    }
  }

  get(callback) {
    let value = localStorage.getItem(this.prefix);

    if(value){
      try{
        value = JSON.parse(value);
      } catch(e) {
        throw new Error('LocalStorage is corrupted');
      }
    } else {
      value = {};
    }

    callback(value);
  }
}

class Observable {
    constructor() {
        this.subscribers = {};
    }

    on(event, callback) {
        this.subscribers[event] = this.subscribers[event] || [];
        this.subscribers[event].push(callback);

        return this;
    }

    dispatch(event, data) {
        let events = this.subscribers[event] || [];

        for (let i = 0; i < events.length; i++) {
            events[i](data);
        }
    }
}

class Calc extends Observable {

    constructor(settings) {
      super()
      this.defaults = {
        scope: '.calculator',
        input: '.input',
        output: '.output',
        data: '',
        inputDelay: 100,
      };

      this.settings = Object.assign({}, this.defaults, settings);
      this.scope = document.querySelector(this.settings.scope);
      this.input = this.scope.querySelector(this.settings.input);
      this.output = this.scope.querySelector(this.settings.output);
      this.parser = math.parser();
      this.timeoutId = '';
      this.initializeEvents();
      this.calculate();
    }

    initializeEvents() {
      this.input.addEventListener('input', this.onInput.bind(this));
      this.input.addEventListener('keydown', this.onKeyDown.bind(this));
      this.input.addEventListener('paste', this.onPaste.bind(this));
      this.output.addEventListener('click', this.onOutputClick);
    }

    calculate() {
      let lines = this.input.children,
          html = '';

      if (!~this.input.innerHTML.indexOf('div')) {
        this.input.innerHTML = '<div></div>';
      }

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i],
            expression = line.textContent.replace(/^\s+|\s+$/g, ''),
            out = document.createElement('div'),
            outInner = document.createElement('span'),
            className = 'result', result;

        try {
            result = this.parser.eval(expression);
        } catch (e) { /* console.log(e) */ }

        if (!result) {
            result = '';
            className += ' empty';
        } else {
            this.parser.scope.prev = result;
        }

        result = result.toString();

        html += `
          <div style="top: ${line.offsetTop}px">
            <span class="${className}" title="${result}">${result}</span>
          </div>
        `;
      }

      this.output.innerHTML = html;
      this.parser.clear();
      this.onChange();
    }

    onKeyDown(e) {
      if (e.which === 173 && e.ctrlKey){
        e.preventDefault();
        e.stopPropagation();

        let line = window.getSelection().focusNode.parentElement;

        line.classList.toggle('completed');
      }
    }

    onInput() {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(this.calculate.bind(this), this.settings.inputDelay);
    }

    onChange() {
      let data = [];

      for (let child of this.input.children) {
        data.push({
          content: child.innerText,
          className: child.className
        })
      }

      this.settings.data = JSON.stringify(data);
      this.dispatch('change', this.settings.data);
    }

    onPaste(e) {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    }

    onOutputClick(e) {
      if (!e.target.classList.contains('result')) {
        return;
      }

      const target = e.target,
            selection = window.getSelection(),
            range = document.createRange();


      target.classList.add('boom');
      setTimeout(() => {
        target.classList.remove('boom');
      }, 200);

      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
    }
}


let storage = new LocalStorage();
let settings = {
  input: ''
};
let calc;
let template = document.querySelector('#calculatorLinesView').innerHTML;

storage.get(function(data){
  Object.assign(settings, data);


  document.querySelector('#app').innerHTML = Mustache.render(template, {
    lines: JSON.parse(settings.input), //.trim().split('\n'),
    className: 'lol'
  });

  calc = new Calc({
    data: settings.input
  });

  calc.on('change', data => {
    settings.input = data;

    storage.set(settings);
  });

});
