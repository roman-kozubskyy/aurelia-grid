System.register(['aurelia-framework', './grid-column', "./pager"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var aurelia_framework_1, grid_column_1, aurelia_framework_2, pager_1;
    var Grid;
    function processUserTemplate(element) {
        var cols = [];
        // Get any col tags from the content
        var rowElement = element.querySelector("grid-row");
        var columnElements = Array.prototype.slice.call(rowElement.querySelectorAll("grid-col"));
        columnElements.forEach(function (c) {
            var attrs = Array.prototype.slice.call(c.attributes), colHash = {};
            attrs.forEach(function (a) { return colHash[a.name] = a.value; });
            var col = new grid_column_1.GridColumn(colHash, c.innerHTML);
            cols.push(col);
        });
        // Pull any row attrs into a hash object
        var rowAttrs = {};
        var attrs = Array.prototype.slice.call(rowElement.attributes);
        attrs.forEach(function (a) { return rowAttrs[a.name] = a.value; });
        return { columns: cols, rowAttrs: rowAttrs };
    }
    return {
        setters:[
            function (aurelia_framework_1_1) {
                aurelia_framework_1 = aurelia_framework_1_1;
                aurelia_framework_2 = aurelia_framework_1_1;
            },
            function (grid_column_1_1) {
                grid_column_1 = grid_column_1_1;
            },
            function (pager_1_1) {
                pager_1 = pager_1_1;
            }],
        execute: function() {
            Grid = (function () {
                function Grid(element, viewCompiler, viewResources, container, targetInstruction, bindingEngine) {
                    this.element = element;
                    this.viewCompiler = viewCompiler;
                    this.viewResources = viewResources;
                    this.container = container;
                    this.targetInstruction = targetInstruction;
                    this.bindingEngine = bindingEngine;
                    this.showNoRowsMessage = false;
                    /* == Styling == */
                    this.gridHeight = 0;
                    /* == Options == */
                    // Initial load flag (for client side)
                    this.initialLoad = false;
                    // Filtering
                    this.showColumnFilters = false;
                    this.serverFiltering = false;
                    this.filterDebounce = 500;
                    // Pagination
                    this.serverPaging = false;
                    this.pageable = true;
                    this.pageSize = 10;
                    this.page = 1;
                    this.pagerSize = 10;
                    this.showPageSizeBox = true;
                    this.showPagingSummary = true;
                    this.showFirstLastButtons = true;
                    this.showJumpButtons = true;
                    this.pageSizes = [10, 25, 50];
                    this.firstVisibleItem = 0;
                    this.lastVisibleItem = 0;
                    this.pageNumber = 1;
                    // Sortination
                    this.serverSorting = false;
                    this.sortable = true;
                    this.sortProcessingOrder = []; // Represents which order to apply sorts to each column
                    this.sorting = {};
                    // Burnination?
                    this.Trogdor = true;
                    this.showColumnHeaders = true;
                    this.columnHeaders = [];
                    this.columns = [];
                    // Selection
                    this.selectable = false;
                    this.selectedItem = null;
                    // Misc
                    this.noRowsMessage = "";
                    // Data ....
                    this.autoLoad = true;
                    this.loading = false;
                    this.loadingMessage = "Loading...";
                    // Read
                    this.read = null;
                    this.onReadError = null;
                    // Tracking
                    this.cache = [];
                    this.data = [];
                    this.count = 0;
                    // Subscription handling
                    this.unbinding = false;
                    // Visual
                    // TODO: calc scrollbar width using browser
                    this.scrollBarWidth = 16;
                    var behavior = targetInstruction.behaviorInstructions[0];
                    this.columns = behavior.gridColumns;
                    this.rowAttrs = behavior.rowAttrs;
                }
                /* === Lifecycle === */
                Grid.prototype.attached = function () {
                    this.gridHeightChanged();
                    if (this.autoLoad)
                        this.refresh();
                };
                Grid.prototype.bind = function (executionContext) {
                    this["$parent"] = executionContext;
                    // Ensure the grid settings
                    // If we can page on the server and we can't server sort, we can't sort locally
                    if (this.serverPaging && !this.serverSorting)
                        this.sortable = false;
                    // The table body element will host the rows
                    var tbody = this.element.querySelector("table>tbody");
                    this.viewSlot = new aurelia_framework_2.ViewSlot(tbody, true);
                    // Get the row template too and add a repeater/class
                    var row = tbody.querySelector("tr");
                    this.addRowAttributes(row);
                    this.rowTemplate = document.createDocumentFragment();
                    this.rowTemplate.appendChild(row);
                    this.buildTemplates();
                };
                Grid.prototype.addRowAttributes = function (row) {
                    row.setAttribute("repeat.for", "$item of data");
                    row.setAttribute("class", "${ $item === $parent.selectedItem ? 'info' : '' }");
                    // TODO: Do we allow the user to customise the row template or just
                    // provide a callback?
                    // Copy any user specified row attributes to the row template
                    for (var prop in this.rowAttrs) {
                        if (this.rowAttrs.hasOwnProperty(prop)) {
                            row.setAttribute(prop, this.rowAttrs[prop]);
                        }
                    }
                };
                Grid.prototype.buildTemplates = function () {
                    var _this = this;
                    // Create a fragment we will manipulate the DOM in
                    var rowTemplate = this.rowTemplate.cloneNode(true);
                    var row = rowTemplate.querySelector("tr");
                    // Create the columns
                    this.columns.forEach(function (c) {
                        var td = document.createElement("td");
                        // Set attributes
                        for (var prop in c) {
                            if (c.hasOwnProperty(prop)) {
                                if (prop == "template")
                                    td.innerHTML = c[prop];
                                else
                                    td.setAttribute(prop, c[prop]);
                            }
                        }
                        row.appendChild(td);
                    });
                    // Now compile the row template
                    var view = this.viewCompiler.compile(rowTemplate, this.viewResources).create(this.container);
                    // Templating 17.x changes the API
                    // ViewFactory.create() no longer takes a binding context (2nd parameter)
                    // Instead, must call view.bind(context)
                    view.bind(this);
                    // based on viewSlot.swap() from templating 0.16.0
                    var removeResponse = this.viewSlot.removeAll();
                    if (removeResponse instanceof Promise) {
                        removeResponse.then(function () { return _this.viewSlot.add(view); });
                    }
                    this.viewSlot.add(view);
                    // code above replaces the following call
                    //this.viewSlot.swap(view);
                    this.viewSlot.attached();
                    // HACK: why is the change handler not firing for noRowsMessage?
                    this.noRowsMessageChanged();
                };
                Grid.prototype.unbind = function () {
                    this.unbinding = true;
                    this.dontWatchForChanges();
                };
                /* === Column handling === */
                Grid.prototype.addColumn = function (col) {
                    // No-sort if grid is not sortable
                    if (!this.sortable)
                        col.nosort = true;
                    this.columns.push(col);
                };
                /* === Paging === */
                Grid.prototype.pageChanged = function (page, oldValue) {
                    if (page === oldValue)
                        return;
                    this.pageNumber = Number(page);
                    this.refresh();
                };
                Grid.prototype.pageSizeChanged = function (newValue, oldValue) {
                    debugger;
                    if (newValue === oldValue)
                        return;
                    this.pageChanged(1, oldValue);
                    this.updatePager();
                };
                Grid.prototype.filterSortPage = function (data) {
                    // Applies filter, sort then page
                    // 1. First filter the data down to the set we want, if we are using local data
                    var tempData = data;
                    if (this.showColumnFilters && !this.serverFiltering)
                        tempData = this.applyFilter(tempData);
                    // Count the data now before the sort/page
                    this.count = tempData.length;
                    // 2. Now sort the data
                    if (this.sortable && !this.serverSorting)
                        tempData = this.applySort(tempData);
                    // 3. Now apply paging
                    if (this.pageable && !this.serverPaging)
                        tempData = this.applyPage(tempData);
                    this.data = tempData;
                    this.updatePager();
                    this.watchForChanges();
                };
                Grid.prototype.applyPage = function (data) {
                    var start = (Number(this.pageNumber) - 1) * Number(this.pageSize);
                    data = data.slice(start, start + Number(this.pageSize));
                    return data;
                };
                Grid.prototype.updatePager = function () {
                    if (this.pager)
                        this.pager.update(this.pageNumber, Number(this.pageSize), Number(this.count));
                    this.firstVisibleItem = (this.pageNumber - 1) * Number(this.pageSize) + 1;
                    this.lastVisibleItem = Math.min((this.pageNumber) * Number(this.pageSize), this.count);
                };
                /* === Sorting === */
                Grid.prototype.fieldSorter = function (fields) {
                    return function (a, b) {
                        return fields
                            .map(function (o) {
                            var dir = 1;
                            if (o[0] === '-') {
                                dir = -1;
                                o = o.substring(1);
                            }
                            if (a[o] > b[o])
                                return dir;
                            if (a[o] < b[o])
                                return -(dir);
                            return 0;
                        })
                            .reduce(function firstNonZeroValue(p, n) {
                            return p ? p : n;
                        }, 0);
                    };
                };
                Grid.prototype.pageSizesChanged = function () {
                    this.refresh();
                };
                Grid.prototype.sortChanged = function (field) {
                    // Determine new sort
                    var newSort = undefined;
                    // Figure out which way this field should be sorting
                    switch (this.sorting[field]) {
                        case "asc":
                            newSort = "desc";
                            break;
                        case "desc":
                            newSort = "";
                            break;
                        default:
                            newSort = "asc";
                            break;
                    }
                    this.sorting[field] = newSort;
                    // If the sort is present in the sort stack, slice it to the back of the stack, otherwise just add it
                    var pos = this.sortProcessingOrder.indexOf(field);
                    if (pos > -1)
                        this.sortProcessingOrder.splice(pos, 1);
                    this.sortProcessingOrder.push(field);
                    // Apply the new sort
                    this.refresh();
                };
                Grid.prototype.applySort = function (data) {
                    // Format the sort fields
                    var fields = [];
                    // Get the fields in the "sortingORder"
                    for (var i = 0; i < this.sortProcessingOrder.length; i++) {
                        var sort = this.sortProcessingOrder[i];
                        for (var prop in this.sorting) {
                            if (sort == prop && this.sorting[prop] !== "")
                                fields.push(this.sorting[prop] === "asc" ? (prop) : ("-" + prop));
                        }
                    }
                    ;
                    if (!fields.length) {
                        return data;
                    }
                    // If server sort, just refresh
                    data = data.sort(this.fieldSorter(fields));
                    return data;
                };
                /* === Filtering === */
                Grid.prototype.applyFilter = function (data) {
                    var _this = this;
                    return data.filter(function (row) {
                        var include = true;
                        for (var i = _this.columns.length - 1; i >= 0; i--) {
                            var col = _this.columns[i];
                            if (col.filterValue !== "" && row[col.field].toString().indexOf(col.filterValue) === -1) {
                                include = false;
                            }
                        }
                        return include;
                    });
                };
                Grid.prototype.getFilterColumns = function () {
                    var cols = {};
                    for (var i = this.columns.length - 1; i >= 0; i--) {
                        var col = this.columns[i];
                        if (col.filterValue !== "")
                            cols[col.field] = col.filterValue;
                    }
                    return cols;
                };
                Grid.prototype.debounce = function (func, wait) {
                    var timeout;
                    // the debounced function
                    return function () {
                        var context = this, args = arguments;
                        // nulls out timer and calls original function
                        var later = function () {
                            timeout = null;
                            func.apply(context, args);
                        };
                        // restart the timer to call last function
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                };
                Grid.prototype.updateFilters = function () {
                    // Debounce
                    if (!this.debouncedUpdateFilters) {
                        this.debouncedUpdateFilters = this.debounce(this.refresh.bind(this), this.filterDebounce || 100);
                    }
                    this.debouncedUpdateFilters();
                };
                /* === Data === */
                Grid.prototype.refresh = function () {
                    // If we have any server side stuff we need to get the data first
                    this.dontWatchForChanges();
                    if (this.serverPaging || this.serverSorting || this.serverFiltering || !this.initialLoad)
                        this.getData();
                    else
                        this.filterSortPage(this.cache);
                };
                Grid.prototype.getData = function () {
                    var _this = this;
                    if (!this.read)
                        throw new Error("No read method specified for grid");
                    this.initialLoad = true;
                    // TODO: Implement progress indicator
                    this.loading = true;
                    // Try to read from the data adapter
                    this.read({
                        sorting: this.sorting,
                        paging: { page: this.pageNumber, size: Number(this.pageSize) },
                        filtering: this.getFilterColumns()
                    })
                        .then(function (result) {
                        // Data should be in the result so grab it and assign it to the data property
                        _this.handleResult(result);
                        _this.loading = false;
                    }, function (result) {
                        // Something went terribly wrong, notify the consumer
                        if (_this.onReadError)
                            _this.onReadError(result);
                        _this.loading = false;
                    });
                };
                Grid.prototype.handleResult = function (result) {
                    // TODO: Check valid stuff was returned
                    var data = result.data;
                    // Is the data being paginated on the client side?
                    // TODO: Work out when we should we use the cache... ever? If it's local data
                    if (this.pageable && !this.serverPaging && !this.serverSorting && !this.serverFiltering) {
                        // Cache the data
                        this.cache = result.data;
                        this.filterSortPage(this.cache);
                    }
                    else {
                        this.data = result.data;
                        this.filterSortPage(this.data);
                    }
                    this.count = result.count;
                    // Update the pager - maybe the grid options should contain an update callback instead of reffing the
                    // pager into the current VM?
                    this.updatePager();
                };
                Grid.prototype.watchForChanges = function () {
                    var _this = this;
                    this.dontWatchForChanges();
                    // Guard against data refresh events hitting after the user does anything that unloads the grid
                    if (!this.unbinding)
                        // We can update the pager automagically
                        this.subscription = this.bindingEngine
                            .collectionObserver(this.cache)
                            .subscribe(function (splices) {
                            _this.refresh();
                        });
                };
                Grid.prototype.dontWatchForChanges = function () {
                    if (this.subscription)
                        this.subscription.dispose();
                };
                /* === Selection === */
                Grid.prototype.select = function (item) {
                    if (this.selectable)
                        this.selectedItem = item;
                    return true;
                };
                /* === Change handlers === */
                Grid.prototype.noRowsMessageChanged = function () {
                    this.showNoRowsMessage = this.noRowsMessage !== "";
                };
                Grid.prototype.gridHeightChanged = function () {
                    // TODO: Make this a one off
                    var cont = this.element.querySelector(".grid-content-container");
                    if (this.gridHeight > 0) {
                        cont.setAttribute("style", "height:" + this.gridHeight + "px");
                    }
                    else {
                        cont.removeAttribute("style");
                    }
                };
                __decorate([
                    aurelia_framework_1.child('pager'), 
                    __metadata('design:type', pager_1.Pager)
                ], Grid.prototype, "pager", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "gridHeight", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "initialLoad", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showColumnFilters", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "serverFiltering", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "filterDebounce", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "serverPaging", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "pageable", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "pageSize", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "page", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "pagerSize", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showPageSizeBox", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showPagingSummary", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showFirstLastButtons", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showJumpButtons", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "pageSizes", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "serverSorting", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Boolean)
                ], Grid.prototype, "sortable", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "autoGenerateColumns", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "showColumnHeaders", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "selectable", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "selectedItem", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "noRowsMessage", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "autoLoad", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "loadingMessage", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "read", void 0);
                __decorate([
                    aurelia_framework_1.bindable, 
                    __metadata('design:type', Object)
                ], Grid.prototype, "onReadError", void 0);
                Grid = __decorate([
                    aurelia_framework_1.customElement('grid'),
                    aurelia_framework_1.processContent(function (viewCompiler, viewResources, element, instruction) {
                        // Do stuff
                        var result = processUserTemplate(element);
                        instruction.gridColumns = result.columns;
                        instruction.rowAttrs = result.rowAttrs;
                        return true;
                    }),
                    aurelia_framework_1.autoinject(), 
                    __metadata('design:paramtypes', [Element, aurelia_framework_2.ViewCompiler, aurelia_framework_2.ViewResources, aurelia_framework_2.Container, aurelia_framework_1.TargetInstruction, aurelia_framework_1.BindingEngine])
                ], Grid);
                return Grid;
            }());
            exports_1("Grid", Grid);
        }
    }
});
