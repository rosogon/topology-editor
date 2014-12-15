/**
 * Node objects
 * 
 * var d1 = Object.create(Graph.Database).init("NAME", "LABEL");
 * console.log(d1.toString());
 * 
 * @author roman.sosa@atos.net
 */

var Graph = (function () {

    var format = function () {
      var i = 1, args = arguments;
      return args[0].replace(/{}/g, function () {
        return typeof args[i] != 'undefined' ? args[i++] : '';
      });
    };

    /*
     * http://davidwalsh.name/javascript-objects-deconstruction
     * 
     * http://toddmotto.com/mastering-the-module-pattern/
     */

    var Link = {
        source: undefined,
        target: undefined,
        setup: function(source, target) {
            this.source = source;
            this.target = target;
            return this;
        },
        toString: function() {
            return format("Link(source='{}',label='{}')",
                this.source.label,
                this.target.label
            );
        }
    };
    

    var Node = {
        setup: function(name, label) {
            this.name = name;
            this.label = label;
            this.type = "Node";
        },
        toString: function(args) {
            return format(
                "Node(name='{}',label='{}',type='{}')",
                this.name, 
                this.label,
                this.type
            );
        },
    };
    
    var Database = Object.create(Node);
    
    Database.init = function(name, label, category) {
        this.setup(name, label);
        this.type = "Database";
        this.category = category;
    
        return this;
    };
    
    Database.toString = function() {
        return format(
            "Database(name='{}', label='{}', category='{}')", 
            this.name, 
            this.label,
            this.category
        );
    };
    
    var WebApplication = Object.create(Node);
    
    WebApplication.init = function(name, label, language) {
        this.setup(name, label);
        this.type = "WebApplication";
        this.language = language;
    
        return this;
    };
    
    WebApplication.toString = function() {
        return format(
            "WebApplication(name='{}', label='{}', language='{}')",
            this.name,
            this.label,
            this.language
        );
    };
    
    var RestService = Object.create(Node);
    
    RestService.init = function(name, label, language) {
        this.setup(name, label);
        this.type = "RestService";
        this.language = language;
    
        return this;
    };
    
    RestService.toString = function() {
        return format(
            "RestService(name='{}', label='{}', language='{}')",
            this.name,
            this.label,
            this.language
        );
    };
    
    return {
        Link: Link,
        Node: Node,
        Graph: Graph,
        WebApplication: WebApplication,
        Database: Database,
        RestService: RestService,
    };
})();
