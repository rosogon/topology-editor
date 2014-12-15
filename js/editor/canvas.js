/**
 * This is a proof of concept of topology editor using Graph.Node objects.
 * 
 * It requires an element with id "canvas" in the document.
 * 
 * To initialize the canvas: Canvas.init(width, height)
 * If no parameters are provided, it defaults to WIDTH, HEIGHT
 * 
 * To update the canvas when nodes are added/modified/removed: Canvas.restart()
 * 
 * Graph.Node is augmented. See functions's implementation for more details:
 * - decorate() : used to generate a different decoration for each
 *   node type (for example, add an image). By default, it appends a text
 *   with the node index. It may be overwritten in a kind basis.
 * - popovertitle(): used to generate the title of the popover when clicking
 *   on a node. By default, it returns the node name.
 * - popovercontent(): used to generate the content of the popover when
 *   clicking on a node. By default, it returns a list containing type and 
 *   index. 
 * 
 * A lot of ideas (and how to achieve some things) taken from :
 * 
 * - http://bl.ocks.org/rkirsling/5001347
 * - http://bl.ocks.org/cjrd/6863459
 *
 * The following prefixes in variables are used:
 *   j_ : jquery selections
 *   d3_ : d3 selections
 *   g_ : Graph.* nodes (or children)
 * 
 * @author roman.sosa@atos.net
 */

var Canvas = (function() {

    Graph.Link.popovertitle = function(i) {
        return "";
    };
    
    Graph.Link.popovercontent = function(i) {
        return "";
    };
    
    Graph.Node.decorate = function(dom_element, i) {
        d3_element = d3.select(dom_element);
        d3_element.append("svg:text")
            .attr("x", 0)
            .attr("y", 9)
            .attr("class", "type-icon")
            .text(i);
    };
    
    Graph.Node.popovertitle = function(i) {
        return this.name;
    };
    
    Graph.Node.popovercontent = function(i) {
        var content = 
            "<dt>Type</dt><dd>" + this.type + "</dd>" + 
            "<dt>Index</dt><dd>" + i + "</dd>";
        return "<dl>" + content + "</dl>";
    };
    
    
    var WIDTH = 960,
        HEIGHT = 500;
        
    var NODE_RADIUS = 20;
        
    var log = Log.getLogger("Canvas").setLevel(Log.DEBUG);
    
    /*
     * All these variables are initialized in init()
     */
    
    var force,                      /* d3 layout force */
        svg,                        /* svg element to add to div id="canvas" */
        drag_line,                  /* line that appears when linking */
        g_nodes,                    /* array of Graph.Nodes */
        links,                      /* array of links between nodes */
        d3_links,                   /* d3 selection of links */
        d3_nodes,                   /* d3 selection of nodes */
        srcnode,                    /* source node when linking */
        linking,                    /* true if linking */
        drag;                       /* d3 drag (used for dragging nodes) */

    function init(width, height) {
        if (width === undefined) {
            width = WIDTH;
        }
        if (height === undefined) {
            height = HEIGHT;
        }

        force = d3.layout.force()
            .size([width, height])
            .nodes([])
            .linkDistance(100)
            .charge(-800)
            .on("tick", tick);

        /*
         * Append svg to canvas
         */
        svg = d3.select("#canvas").append("svg")
            .attr("width", width)
            .attr("height", height)
            .on("mousemove", mousemove)
            .on("click", click);
        
        svg.append("rect")
            .attr("width", width)
            .attr("height", height);
        
        /*
         * define arrow markers for graph links
         */ 
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
          .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
          .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('fill', '#000');
        
        /*
         * line displayed when dragging new nodes
         */
        drag_line = svg.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0');
          
        g_nodes = force.nodes();
        links = force.links();
        
        /*
         * Append g to svg to store links
         */    
        d3_links = svg.append("svg:g").attr("class", "linkgroup").selectAll(".link");
        
        /*
         * Append g to svg to store nodes
         */
        d3_nodes = svg.append("svg:g").attr("class", "nodegroup").selectAll("g");
        
        srcnode = undefined;
        linking = 0;
        
        drag = force.drag()
            .origin(function(d){
                return {x: d.x, y: d.y};
            })
            .on("dragstart", dragstart)
            .on("dragend", dragend)
            .on("drag", dragmove)
            .on("drag.force", null)
            ;

        /*
         * register key events
         */
        d3.select(window)
            .on('keydown', keydown)
            .on('keyup', keyup);
        
        restart();
        log.debug("Canvas(" + width + "," + height + ") initialized");
    }


    function mousemove() {
        if(!linking) {
            return;
        }
    
        var mousex = d3.mouse(this)[0],
            mousey = d3.mouse(this)[1];
            
        // update drag line
        drag_line.attr(
            'd', 
            'M' + srcnode.x + ',' + srcnode.y + 'L' + mousex + ',' + mousey
        );
    
        restart();
    }
    
    
    function mousedown(d3node, d) {
    
        log.debug("mousedown " + "d3node="+d3node.label + " d=" + d);
        if (d3.event.shiftKey) {
            drag_line.classed("hidden", false);
                // .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
            return;
        }
        // restart();  
    }
    
    
    function mouseup(d3node, d) {
        /*
         * if linking, d3node is dest node, else src node.
         */
        log.debug("mouseup " + "d3node="+d3node.label + " d=" + d);
        
        if (linking && d3node !== srcnode) {
            
            addlink(srcnode, d3node);
            drag_line.classed("hidden", true);
            restart();
        }
    }
    
    
    function dragclick() {
        log.debug("dragclick");
    }
    
    
    function click() {
        /*
         * Couldn't manage to defaultPrevent on linking.
         */
        if (d3.event.defaultPrevented) {
            log.debug("click prevented");
            linking = false;
            return; // click suppressed
        }
        log.debug("click");
    }
    
    
    function dragstart(selected) {
        var e = d3.event.sourceEvent;
    
        if(e.shiftKey || e.ctrlKey) {
            linking = true;
            srcnode = selected;
            log.debug('linkstart - srcnode = ' + selected.label);
            return;
        }
    
        log.debug("dragstart");
        selected.fixed = true;
        g_nodes.forEach(function(node) {
            if (node !== selected) {
                node.fixed = false;
            }
        });
    }
    
    
    function dragmove(selected) {
        
        if (!linking) {
            log.debug("dragmove " + selected.label);
            selected.px += d3.event.dx;
            selected.py +=  d3.event.dy;
            restart();
        }
    }
    
    
    function dragend(selected) {
    
        var e = d3.event.sourceEvent;
        
        if(linking) {
            log.debug("dragend - linking");
            srcnode = undefined;
            linking = false;
            /*
             * firefox does not enter click when linking, so reset is done
             * here
             */
        }
        else {
            log.debug("dragend - moving");
        }
    
    }
    
    
    function keydown() {
        
        var e = d3.event;
        
        // if (e.keyCode === 17) {
            // node
                // .on('mousedown.drag', null)
                // .on('touchstart.drag', null);
            // linking = true;
        // }
    }
    
    
    function keyup() {
        var e = d3.event;
        
        if (e.keyCode === 17) {
            // node.call(force.drag);
        }
    }
    
    
    function tick() {
        
      d3_links.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = NODE_RADIUS,
            targetPadding = NODE_RADIUS + 4,
            sourceX = d.source.x + (sourcePadding * normX),
            sourceY = d.source.y + (sourcePadding * normY),
            targetX = d.target.x - (targetPadding * normX),
            targetY = d.target.y - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
      });
        
      d3_nodes.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    }
    
    
    function restart() {
        
        /*
         * handle links
         */
        d3_links = d3_links.data(links);
    
        var newlinks = d3_links.enter().append("svg:path");
        
        newlinks
            .attr("class", "link")
            .style("marker-end", "url(#end-arrow)");
            
        newlinks.attr("data-popover", "true").each(function(d, i) {
            $(this).popover(
                {
                    'container' : 'body',
                    'title'     : function() { return d.popovertitle(i); },
                    'html'      : true,
                    'trigger'   : 'manual'
                }
            );
        });
        newlinks.on("click", function(d, i) {
            var e = d3.event;
    
            if (e.defaultPrevented) {
                log.debug("link.click prevented");
                return; // click suppressed
            }
    
            log.debug("link.click");
            if(e.shiftKey || e.ctrlKey){
            }else{
                log.debug("Popover " + d.toString());
                var self = this;
                $('[data-popover]').each(function (i) {
                    $(this).not(self).popover('hide');
                });                
                $(this).popover("toggle");
            }
            e.stopPropagation();
        });
            
    
        /*
         * remove old links
         */ 
        d3_links.exit().remove();
    
        /*
         * handle nodes
         * 
         * TODO: Evaluate use second arg = function(d) { return d.name; }
         */
        var selection = svg.select("g.nodegroup").selectAll("g");
        var data = selection.data(g_nodes);
        d3_nodes = data;
        
        data.select("text.nodelabel").text(function(d) { return d.label; });
        
        var newnodes = data.enter().append("svg:g");
        newnodes.append("circle")
            .attr("class", "node")
            .attr("r", NODE_RADIUS);

        newnodes.each(function(d, i) {
            var g_node = g_nodes[i];
            g_node.decorate(this, i);
        });
            
        newnodes.append("svg:text")
            .attr("x", 0)
            .attr("y", 30)
            .attr("class", "nodelabel")
            .text(function(d) { return d.label; });
    
        newnodes.attr("data-popover", "true").each(function(d, i) {
            $(this).popover(
                {
                    'container' : 'body',
                    'placement' : 'auto right',
                    'title'     : function() { return d.popovertitle(i); },
                    'content'   : function() { return d.popovercontent(i); },
                    'html'      : true,
                    'trigger'   : 'manual'
                }
            );
        });
        
        newnodes.on("click", function(d, i) {
            var e = d3.event;
    
            if (e.defaultPrevented) {
                log.debug("node.click prevented");
                return; // click suppressed
            }
    
            log.debug("node.click");
            if(e.shiftKey || e.ctrlKey){
            }else{
                log.debug("Popover " + d.toString());
                var self = this;
                $('[data-popover]').each(function (i) {
                    $(this).not(self).popover('hide');
                });                
                $(this).popover('toggle');
            }
            e.stopPropagation();
        })
        .on("mousedown", function(d){
            mousedown.call(d3.select(this), d);
        })
        .on("mouseup", function(d){
            mouseup.call(d3.select(this), d);
        })
        .on('mousemove.drag', null);

        newnodes.call(force.drag);
    
        /*
         * remove old nodes
         */
        data.exit().remove();
    
        force.start();
    }

    function getnode(id) {
        return g_nodes[id];
    }
    
    function getlink(id) {
        return links[id];
    }
    
    function addnode(node) {
        log.info("Adding node " + node.toString());
        g_nodes.push(node);
    }
    
    function addlink(source, target) {
        log.info("Adding link{source=" + source.label + 
            " target=" + target.label + "}");
        var newlink = Object.create(Graph.Link).setup(source, target);
        links.push(newlink);
    }
    
    function _remove(array, filter) {
        for (var i = 0; i < array.length; ) {
            var item = array[i];
            
            if (filter(item)) {
                array.splice(i, 1);
            }
            else {
                i++;
            }
        }
    }
    
    function removenode(node) {
        log.info("Removing node " + node.label);

        _remove(links, function(link) {
            return (link.source === node || link.target === node);
        });
        
        _remove(g_nodes, function(n) {
            return n === node;
        });
        restart();
    }

    function removelink(link) {
        log.info("Removing link [source=" + link.source.label + 
                ", target=" + link.target.label + "]");
        _remove(links, function(l) {
            return l === link;
        });
        restart();
    }
    
    return {
        init: init,
        restart: restart,
        getnode: getnode,
        getlink: getlink,
        addnode: addnode,
        addlink: addlink,
        removenode: removenode,
        removelink: removelink,
    };
})();
