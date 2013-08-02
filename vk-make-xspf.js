// -*- mode: javascript; coding: utf-8 -*-
//
// Copyright 2012, 2013 Andrej A Antonov <polymorphm@gmail.com>.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// ------------------------------INSTRUCTION----------------------------------
//
// Using in console -- this command:
//      (function (g, d, m) {'use strict'; var x = g[m]; if (x) { x() } else { x = d.createElement('script'); x.src = m; x.charset = 'utf-8'; d.body.appendChild(x) } })(this, document, 'https://raw.github.com/vk-make-xspf-2012-04-13/vk-make-xspf/active/vk-make-xspf.js')
//
// For opening console in Mozilla Firefox -- press [CTRL]+[SHIFT]+[K]
//
// ---------------------------------------------------------------------------

(function (global) {
    'use strict'
    
    var MAIN_NAME = 'http://bit.ly/2012-04-13-vk-make-xspf'
    var XSPF_XMLNS = 'http://xspf.org/ns/0/'
    
    function replace_cycle (str, old_sub_str, new_sub_str) {
            var new_str
            
            for (;;) {
                new_str = str.replace(old_sub_str, new_sub_str)
                
                if (new_str != str) {
                    str = new_str
                    continue
                }
                
                break
            }
            
            return new_str
    }
    
    function replace_all (str, old_sub_str, new_sub_str) {
        var marker = '*'
        
        while (str.indexOf(marker) != -1) {
            marker += Math.floor((Math.random() * 10)).toString() + '*'
        }
        
        while (new_sub_str.indexOf(marker) != -1) {
            marker += Math.floor((Math.random() * 10)).toString() + '*'
        }
        
        var new_str = replace_cycle(str, old_sub_str, marker)
        var new_new_str = replace_cycle(new_str, marker, new_sub_str)
        
        return new_new_str
    }
    
    function XMLIndent () {}
    
    XMLIndent.prototype._SPACE = '    '
    
    XMLIndent.prototype.init = function (elem, doc, level) {
        this._elem = elem
        this._doc = doc
        this._level = level
        this._first_adding = true
    }
    
    function new_xml_indent () {
        var new_xml_indent = new XMLIndent
        new_xml_indent.init.apply(
                new_xml_indent, Array.prototype.slice.call(arguments))
        return new_xml_indent
    }
    
    XMLIndent.prototype.get_level = function () {
        return this._level
    }
    
    XMLIndent.prototype.appendChild = function (child_elem) {
        var pre_indent = ''
        var post_indent = '\n'
        
        for (var i = 0; i < this._level - 1; ++i) {
            post_indent += this._SPACE
        }
        if (this._first_adding) {
            this._first_adding = false
            
            pre_indent = post_indent
        }
        pre_indent += this._SPACE
        
        this._elem.appendChild(this._doc.createTextNode(pre_indent))
        this._elem.appendChild(child_elem)
        this._elem.appendChild(this._doc.createTextNode(post_indent))
    }
    
    function XSPFBuilder () {}
    
    XSPFBuilder.prototype._XMLNS = XSPF_XMLNS
    
    XSPFBuilder.prototype.init = function () {
        this._doc = document.implementation.createDocument(
                this._XMLNS, 'playlist', null)
        this._playlist = this._doc.firstChild
        this._playlist_indent = new_xml_indent(this._playlist, this._doc, 1)
        this._track_list = this._doc.createElementNS(this._XMLNS, 'trackList')
        this._track_list_indent = new_xml_indent(
                this._track_list, this._doc, this._playlist_indent.get_level() + 1)
        
        this._playlist.setAttributeNS('', 'version', '1')
        
        this._playlist_indent.appendChild(this._track_list)
    }
    
    function new_xspf_builder () {
        var xspf_builder = new XSPFBuilder
        xspf_builder.init.apply(
                xspf_builder, Array.prototype.slice.call(arguments))
        return xspf_builder
    }
    
    XSPFBuilder.prototype.add_track = function (kwargs) {
        if (kwargs === undefined) {
            kwargs = {}
        }
        
        var track = this._doc.createElementNS(this._XMLNS, 'track')
        var track_indent = new_xml_indent(
                track, this._doc, this._track_list_indent.get_level() + 1)
        
        if (kwargs.creator !== undefined) {
            var creator = this._doc.createElementNS(this._XMLNS, 'creator')
            creator.appendChild(document.createTextNode(kwargs.creator))
            track_indent.appendChild(creator)
        }
        
        if (kwargs.title !== undefined) {
            var title = this._doc.createElementNS(this._XMLNS, 'title')
            title.appendChild(document.createTextNode(kwargs.title))
            track_indent.appendChild(title)
        }
        
        if (kwargs.location !== undefined) {
            var location = this._doc.createElementNS(this._XMLNS, 'location')
            location.appendChild(document.createTextNode(kwargs.location))
            track_indent.appendChild(location)
        }
        
        if (kwargs.info !== undefined) {
            var info = this._doc.createElementNS(this._XMLNS, 'info')
            info.appendChild(document.createTextNode(kwargs.info))
            track_indent.appendChild(info)
        }
        
        this._track_list_indent.appendChild(track)
    }
    
    XSPFBuilder.prototype.get_out = function () {
        var srl = new XMLSerializer()
        
        return srl.serializeToString(this._doc)
    }
    
    function FetchBuilder () {}
    
    FetchBuilder.prototype.init = function () {
        this._out_list = []
    }
    
    FetchBuilder.prototype._quote = function (arg) {
        return '\'' + replace_all(arg, '\'', '\'\\\'\'') + '\''
    }
    
    FetchBuilder.prototype._next_track_no = function () {
        var no = this._out_list.length + 1
        var no_str = no.toString()
        
        while (no_str.length < 4) {
            no_str = '0' + no_str
        }
        
        return no_str
    }
    
    FetchBuilder.prototype.add_track = function (kwargs) {
        if (kwargs === undefined) {
            kwargs = {}
        }
        
        var location = kwargs.location
        
        if (!location) {
            return
        }
        
        var title
        
        if (kwargs.title) {
            title = kwargs.title
        } else {
            title = '(Unknown Track)'
        }
        
        if (kwargs.creator !== undefined) {
            title = kwargs.creator + ' - ' + title
        }
        
        title = this._next_track_no() + ' - ' + title
        
        replace_all(title, '/', ' ')
        
        var cmd = 'fetch_track_file ' + this._quote(title) + ' ' + this._quote(location)
        
        this._out_list.push(cmd)
    }
    
    function new_fetch_builder () {
        var fetch_builder = new FetchBuilder
        fetch_builder.init.apply(
                fetch_builder, Array.prototype.slice.call(arguments))
        return fetch_builder
    }
    
    FetchBuilder.prototype.get_out = function () {
        if (this._out_list.length) {
            return this._out_list.join('\n')
        } else {
            return '# track list is empty. nothing to do'
        }
    }
    
    function query_selector_any(elem, sel_list) {
        for (var i = 0; i < sel_list.length; ++i) {
            var sel = sel_list[i]
            var val = elem.querySelector(sel)
            
            if (val) {
                return val
            }
        }
    }
    
    function get_elem_value (elem) {
        var child = elem.firstChild
        
        if (!child || !child.nodeValue) {
            return ''
        }
        
        return child.nodeValue.replace(/^\s+|\s+$/g, '')
    }
    
    function get_href() {
        return location.href
    }
    
    function get_track_id (elem) {
        var raw_track_id = elem.getAttribute('id')
        
        if (raw_track_id.indexOf('audio')) {
            return
        }
        
        return raw_track_id.slice('audio'.length)
    }
    
    function get_location (elem, track_id) {
        var audio_info_elem = elem.querySelector('#audio_info' + track_id)
        
        if (!audio_info_elem) {
            return
        }
        
        var raw_value = audio_info_elem.getAttribute('value')
        
        if (!raw_value) {
            return
        }
        
        return raw_value.split(',', 2)[0]
    }
    
    function get_creator (elem, track_id) {
        var creator_elem = query_selector_any(elem,  [
                '.info > .title_wrap > b > a',
                '.info > .title_wrap > b',
                '.info > .audio_title_wrap > b > a',
                '.info > .audio_title_wrap > b',
                ])
        
        if (!creator_elem) {
            return
        }
        
        return get_elem_value(creator_elem)
    }
    
    function get_title (elem, track_id) {
        var title_elem = query_selector_any(elem,  [
                '.info > .title_wrap > .title > a',
                '.info > .title_wrap > .title',
                '.info > .audio_title_wrap > .title > a',
                '.info > .audio_title_wrap > .title',
                ])
        
        if (!title_elem) {
            return
        }
        
        return get_elem_value(title_elem)
    }
    
    function scan_elem (elem, add_track_callback) {
        var track_id = get_track_id(elem)
        
        if (!track_id) {
            return
        }
        
        var location = get_location(elem, track_id)
        
        if (!location) {
            return
        }
        
        var creator = get_creator(elem, track_id)
        var title = get_title(elem, track_id)
        
        add_track_callback({
            creator: creator,
            title: title,
            location: location,
            info: get_href(),
        })
    }
    
    function scan (add_track_callback) {
        var elem_list = document.querySelectorAll(
                'html > body #audios_list > #initial_list > *')
        
        for (var i = 0, elem = elem_list.item(0);
                elem; elem = elem_list.item(++i)) {
            scan_elem(elem, add_track_callback)
        }
    }
    
    function print (text) {
        var layout = document.querySelector(
                'html > body #page_layout > #footer_wrap')
        var output = document.createElement('pre')
        
        output.style.marginTop = '15px'
        output.style.marginLeft = '30px'
        output.style.marginRight = '30px'
        output.style.marginBottom = '15px'
        output.style.overflow = 'visible'
        output.style.textAlign = 'left'
        
        output.appendChild(document.createTextNode(text))
        layout.appendChild(output)
    }
    
    function main () {
        var xspf_builder = new_xspf_builder()
        var fetch_builder = new_fetch_builder()
        
        scan(function (kwargs) {
            xspf_builder.add_track(kwargs)
            fetch_builder.add_track(kwargs)
        })
        
        print(
            '-----BEGIN XSPF FILE-----\n' +
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            xspf_builder.get_out() +
            '\n-----END XSPF FILE-----'
            )
        
        print(
            '-----BEGIN FETCH SCRIPT-----\n' +
            '#!/usr/bin/env bash\n\n' +
            'fetch_track_file () {\n' +
            '    wget -t 20 -c --output-document="$1.mp3" -- "$2"\n' +
            '}\n\n' +
            fetch_builder.get_out() +
            '\n-----END FETCH SCRIPT-----'
            )
    }
    
    global[MAIN_NAME] = main
    
    main()
})(this)
