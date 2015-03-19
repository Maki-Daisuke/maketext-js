maketext-js
===========

Introduction
------------

"maketext-js" (aka Locale.Maketext) is a framework for localization.
This is actually JavaScript port of Sean M. Burke's CPAN module [Locale::Maketext](http://search.cpan.org/~ferreira/Locale-Maketext-1.13/lib/Locale/Maketext.pod Maketext).


Synopsis
--------

For instance, you can write Web page supporting both English and Japanese in the following codes:

- MyI18N.js

```javascript
var MyI18N = new Locale.Maketext({
    languages: [
        'en',
        'ja'
    ]
});
```

- en.js

```javascript
MyI18N.lexicon("en", {
    "Input your name.": "Input your name.",
    "Hello, [_1]!"    : "Hello, [_1]!"
});
```

- ja.js

```javascript
MyI18N.lexicon("ja", {
    "Input your name.": "名前を入力してください．",
    "Hello, [_1]!"    : "[_1]さん，こんにちは！"
});
```

- your.html

```javascript
<script type="text/javascript" src="Locale-Maketext.js"></script>
<script type="text/javascript" src="MyI18N.js"></script>
<script type="text/javascript">
  MyI18N.getHandle({
    onSuccess: function( handle ) {
      var name = prompt(handle.maketext("Input your name."));
      alert(handle.maketext("Hello, [_1]!", "hoge"));
    }
  });
</script>
```

That's it!


Project Status
--------------

This project is still pre-beta stage.
And so, the implementation is unstable, and even API is subject to change.

Please give us your comments and suggestions. We will appreciate any comments from you!


See also
--------

Unfortunately, this project provides very few documents at the present time.
Please consult original [Maketext's documents](http://search.cpan.org/~ferreira/Locale-Maketext-1.13/lib/Locale/Maketext.pod) for more information.


Copyright
---------

Copyright (c) 2009 Coma-systems Co. Ltd. All rights reserved.

This library is free software; you can redistribute it and/or modify it under Artistic License or GNU General Public License (GPL).
