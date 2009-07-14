var Locale;  if ( !(Locale instanceof Object) ) Locale = {};
(function(){
    
    var TIMEOUT = 20000;  // time to wait for loading script (msec)
    
    
    Locale.Maketext = function ( base ) {
        this._base_url     = base || "";
        this._lexicons     = {};
        this._callbacks    = {};
    };
    
    var proto = Locale.Maketext.prototype;
    
    proto._load = function ( lang, onSuccess, onError ) {
        if ( typeof onSuccess != "function" ) {
            throw new TypeError("`" + onSuccess + "' is not a function");
        }
        if ( arguments.length >= 3  &&  typeof onError != "function" ) {
            throw new TypeError("`" + onError + "' is not a function");
        }
        if ( this._lexicons.hasOwnProperty(lang) ) {
            var self = this;
            setTimeout(function(){
                onSuccess();
            }, 1);
            return;
        }
        if ( this._callbacks.hasOwnProperty(lang) ) {
            this._callbacks[lang].onSuccess.push(onSuccess);
            if ( onError ) this._callbacks[lang].onError.push(onError);
            return;
        }
        var self = this;
        this._callbacks[lang] = {
            onSuccess: [onSuccess],
            onError  : onError ? [onError]: [],
            timer    : setTimeout(function(){
                var onError = self._callbacks[lang].onError;
                for ( var i=0;  i < onError.length;  i++ ) {
                    onError[i]();
                }
                delete self._callbacks[lang];
            }, TIMEOUT)
        };
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src  = this._base_url + lang + ".js";
        (document.getElementsByTagName("head")[0] || document.body || document).appendChild(script);
    };
    
    proto.lexicon = function ( lang, base, lexicon ) {
        if ( typeof base != "string" ) {
            lexicon = base;
            base    = null;
        }
        if ( base ) {
            var self = this;
            this._load(base,
                function(){
                    self._lexicon_aux(lang, spawn(self._lexicons[base]), lexicon);
                },
                function(){
                    throw new Error("Can't load lexicon file for `" + lang + "'");
                }
            );
        } else {
            this._lexicon_aux(lang, {}, lexicon);
        }
    };
    
    function spawn ( obj ) {
        temp.prototype = obj;
        return new temp();
    }
    function temp(){}
    
    proto._lexicon_aux = function ( lang, lexobj, lexicon ) {
        for ( var i in lexicon ) {
            if ( lexicon.hasOwnProperty(i) ) {
                lexobj[i] = lexobj[lexicon[i]] = lexicon[i];
            }
        }
        this._lexicons[lang] = lexobj;
        if ( !this._callbacks.hasOwnProperty(lang) ) return;
        var callbacks = this._callbacks[lang];
        delete this._callbacks[lang];
        clearTimeout(callbacks.timer);
        for ( var i=0;  i < callbacks.onSuccess.length;  i++ ) {
            callbacks.onSuccess[i]();
        }
    };
    
    proto.getHandle = function ( opts ) {
        opts = opts || {};
        var lang = opts.lang || navigator.language;
        var onSuccess = opts.onSuccess;
        var onError   = opts.onError;
        lang = this._resolution_order(lang);
        var i = 0;
        var self = this;
        function success ( ) {
            onSuccess( new Locale.Maketext.Handle(self._lexicons[lang[i]]) );
        }
        function error ( ) {
            if ( ++i < lang.length ) {
                self._load(lang[i], success, error);
            } else {
                if ( typeof onError == "function" ) {
                    onError();
                } else {
                    throw new Error("Can't load lexicon file for any of the followings: " + lang.join(","));
                }
            }
        }
        this._load(lang[i], success, error);
    };
    
    proto._resolution_order =function ( lang ) {
        var resolved = String(lang).match(/(\w+(?:-\w+)*)/g) || [];
        var superordinate = [];
        for ( var i=0;  i < resolved.length;  i++ ) {
            var tmp = String(resolved[i]).split(/-/);
            tmp.pop();
            while ( tmp.length ) {
                superordinate.push(tmp.join("-"));
                tmp.pop();
            }
        }
        resolved = resolved.concat(superordinate, this.fallback_languages());
        if ( !resolved.length ) throw new Error("empty language specification: " + lang);
        return resolved;
    };
    
    proto.fallback_languages = function ( ) {
        return ['i-default', 'en', 'en-US'];
    };
    
    
    Locale.Maketext.Handle = function ( lexicon ) {
        this._lexicon = lexicon;
    };

    Locale.Maketext.Handle.prototype.maketext = function ( id ) {
        if ( typeof this._lexicon[id] != "function" ) {
            this._lexicon[id] = compile(this._lexicon[id]);
        }
        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift(this);
        return this._lexicon[id].apply(this, args);
    };
    
    
    // Compiler for bracket notation
    function compile ( str ) {
        var ctx = (new Parser(str)).parse();
        return eval("(function(){ return " + ctx.val.compile() + "; })");
    }
    
    function unescape ( s ) {
        return String(s).replace(/~([\[\],~])/g, "$1");
    }


    function Parser ( str, pos, val ) {
        this.str = String(str);
        this.pos = Number(pos) || 0;
        this.val = val;
    }

    var proto = Parser.prototype;
    
    proto.toString = function ( ) {
        return this.str.slice(0, this.pos) + " <-- HERE --> " + this.str.slice(this.pos);
    };
    
    proto.error = function ( msg ) {
        throw new SyntaxError( msg + ": " + this.toString());
    };
    
    proto.isEOS = function ( ) {
        return this.pos >= this.str.length;
    }
    
    proto.stepTo = function ( pos ) {
        return new Parser(this.str, Number(pos)||0, this.val);
    };
    
    proto.stepBy = function ( pos ) {
        return new Parser(this.str, this.pos+Number(pos)||0, this.val);
    };
    
    proto.charAt = function ( pos ) {
        pos = Number(pos);
        if ( isNaN(pos) ) pos = this.pos;
        return this.str.charAt(pos);
    };
    
    proto.value = function ( v ) {
        return new Parser(this.str, this.pos, v);
    };
    
    proto.match = function ( regex ) {
        if ( !(regex instanceof RegExp) ) regex = new Regex(regex, "g");
        regex.global = true;
        regex.lastIndex = this.pos;
        var m = regex.exec(this.str);
        if ( m ) {
            return ctx = this.stepTo(regex.lastIndex).value(m);
        } else {
            return this.value(m);
        }
    };
    
    proto.parse = function ( ) {
        var seq = new Seq();
        var ctx = this;
        while ( !ctx.isEOS() ) {
            ctx = ctx.match(/[^\[~]*(?:~[\[\],~]?[^\[~]*)*/g);
            var str = ctx.val[0];
            if ( str ) {
                seq.add(new Lit(unescape(str)));
            }
            ctx = ctx.parse_bracket();
            if ( ctx.val ) seq.add(ctx.val);
        }
        return ctx.value(seq);
    }
    
    proto.parse_bracket = function ( ) {
        if ( this.charAt() != '[' ) return this.value(null);
        var ctx = this.stepBy(1);
        ctx = ctx.parse_method();
        var bracket = ctx.val;
        while ( ctx.charAt() == ',' ) {
            ctx = ctx.stepBy(1).parse_arg();
            bracket.add(ctx.val);
        }
        if ( ctx.charAt() != ']' ) {
            this.error("unmatched `['");
        }
        ctx = ctx.stepBy(1);
        if ( bracket instanceof Seq  &&  bracket.seq.length == 0 ) {
            return ctx.value(null);
        }
        return ctx.value(bracket);
    }
    
    proto.parse_method = function ( ) {
        var ctx = this.match(/_(-?\d+)|_\*|\*|\#|[a-zA-Z_$]\w*|/g);
        var m = ctx.val;
        switch ( ctx.str.charAt(ctx.pos) ) {
            case ',':
            case ']':
                break;
            default:
                ctx.error("unknown context");
        }
        if ( m[1] ) {
            return ctx.value(new Seq([new Ref(m[1])]));
        } else {
            switch ( m[0] ) {
                case "":
                    return ctx.value(new Seq());
                case "_*":
                    ctx.error("`_*' is not supported");
                case "*":
                    return ctx.value(new Call("quant"));
                case "#":
                    return ctx.value(new Call("numf"));
                default:
                    return ctx.value(new Call(m[0]));
            }
        }
    }
    
    proto.parse_arg = function ( ) {
        var arg = new Seq();
        var ctx = this;
        while ( !ctx.isEOS() ) {
            ctx = ctx.match(/[^\[\],~]*(?:~[\[\],~]?[^\[\],~]*)*/g);
            var str = ctx.val[0];
            if ( str ) {
                var m;
                if ( m = str.match(/^_(-?\d+)$/) ) {
                    arg.add(new Ref(m[1]));
                } else if ( str == "_*" ) {
                    throw new SyntaxError("`_*' is not supported");
                } else {
                    arg.add(new Lit(unescape(str)));
                }
            }
            switch ( ctx.charAt() ) {
                case '[':
                    ctx = ctx.parse_bracket();
                    if ( ctx.val ) arg.add(ctx.val);
                    break;
                case ',':
                case ']':
                    return arg.seq.length == 0 ? ctx.value(new Lit("")) :
                           arg.seq.length == 1 ? ctx.value(arg.seq[0])  :
                                                 ctx.value(argg)        ;
            }
        }
        ctx.error("unmatched `['");
    }
    
    
    function Expression ( ) {
        // abstract class
    }
    
    
    function Seq ( arr ) {
        this.seq = arr || [];
    }
    
    var proto = Seq.prototype = new Expression();
    proto.constructor = Seq;
    
    proto.add = function ( /* var args */ ) {
        return this.seq.push.apply(this.seq, arguments);
    };
    
    proto.concat = function ( that ) {
        return new Seq(this.seq.concat(that.seq));
    };
    
    proto.compile = function ( ) {
        var buf = [];
        for ( var i=0;  i < this.seq.length;  i++ ) {
            buf.push(this.seq[i].compile());
        }
        return "[" + buf.join(",") + "].join('')";
    };
    
    function Lit ( str ) {
        this.str = String(str);
    }
    
    var proto = Lit.prototype = new Expression();
    proto.constructor = Lit;

    proto.compile = function ( ) {
        return '"' + this.str.replace(/(["\\\b\f\n\r\t\v\u2028\u2029])/g, function( c ){
            switch ( c ) {
                case "\b":
                    return "\\b";
                case "\f":
                    return "\\f";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case "\t":
                    return "\\t";
                case "\v":
                    return "\\v";
                case "\u2028":
                    return "\\u2028";
                case "\u2029":
                    return "\\u2029";
                default:
                    return "\\" + c;
            }
        }) + '"';
    };
    

    function Ref ( idx ) {
        this.idx = Number(idx) || 0;
    }
    
    var proto = Ref.prototype = new Expression();
    proto.constructor = Ref;
    
    proto.compile = function ( ) {
        if ( this.idx < 0 ) {
            return "arguments[arguments.length + " + this.idx + "]";
        } else {
            return "arguments[" + this.idx + "]";
        }
    };
    
    
    function Call ( name, args ) {
        this.name = String(name);
        this.args = args || [];
    }
    
    var proto = Call.prototype = new Expression();
    proto.constructor = Call;
    
    proto.add = function ( /* var args */ ) {
        this.args.push.apply(this.args, arguments);
    };
    
    proto.compile = function ( ) {
        var buf = ["this"];
        for ( var i=0;  i < this.args.length;  i++ ) {
            buf.push(this.args[i].compile());
        }
        return "this." + this.name + "(" + buf.join(",") + ")";
    };
    
})();
