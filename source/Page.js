'use strict';

const EventEmitter = require('events'), WinAX = require('winax');


/**
 * Web page
 *
 * @class
 * @extends {EventEmitter}
 */
class Page extends EventEmitter {

    constructor(headless = true) {

        super();

        this._target = new ActiveXObject('InternetExplorer.Application');

        this._target.Visible = !headless;
    }

    static proxy(COM) {

        const getter = { };

        for (let key  of  COM.__type)
            if (key.invkind === 2)  getter[ key.name ] = 1;

        return  new Proxy(COM, {
            get:    function (target, name) {

                target = target[ name ];

                return  (name in getter)  ?  target.valueOf()  :  target;
            }
        });
    }

    get document() {  return  Page.proxy( this._target.Document );  }

    get window() {  return  Page.proxy( this.document.defaultView );  }

    url() {

        return  this._target.LocationURL + '';
    }

    title() {

        return  this._target.LocationName + '';
    }

    goto(url = 'about:blank') {

        this._target.navigate( url );

        const IE = this._target;

        return  new Promise(function (resolve) {

            setTimeout(function check() {

                if (IE.Busy.valueOf() === false)
                    resolve();
                else
                    setTimeout( check );
            });
        });
    }

    async goBack() {

        this._target.GoBack();
    }

    async goForward() {

        this._target.GoForward();
    }

    async reload() {

        this._target.Refresh();
    }

    async close() {

        this._target.Quit();

        WinAX.release( this._target );

        this.emit('close');
    }

    async $(selector = '') {

        return  Page.proxy( this.document.querySelector( selector ) );
    }

    async $$(selector = '') {

        const list = this.document.querySelectorAll( selector );

        const length = list.length - 0, result = [ ];

        for (let i = 0;  i < length;  i++)
            result[i] = Page.proxy( list.item(i) );

        return result;
    }

    async evaluate(expression, ...parameter) {

        expression = `self.name = JSON.stringify(${
            (expression instanceof Function)  ?
                `(${expression})(${
                    parameter.map(item => JSON.stringify( item ))
                })` :
                `(function () { return ${expression}; })()`
        })`;

        this.window.execScript( expression );

        return  JSON.parse( this.window.name );
    }

    async content() {

        const DocType = this.document.doctype;

        var type = `<!DocType ${(DocType.name + '').toUpperCase()}`;

        if ( DocType.publicId.valueOf() )
            type += ` Public "${DocType.publicId}"`;

        if ( DocType.systemId.valueOf() )
            type += ` "${DocType.systemId}"`;

        return `${type}>${this.document.documentElement.outerHTML}`;
    }
}

module.exports = Page;