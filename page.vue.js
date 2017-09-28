Vue.component('list-component', {
  props: ['list'],
  template: `
  <article class="list mdc-card" v-bind:style="position"
    :class="{ 'mdc-elevation--z4': this.hover && !this.list.dragging,
              'mdc-elevation--z8': this.list.dragging }"
    @mouseover="() => { this.hover = true; }"
    @mouseleave="() => { this.hover = false; }">
    <h1 class="mdc-card__primary mdc-card__title"
      contenteditable
      @blur="titleChanged"
      @keypress="preventNewLine"
      @paste="stripNewLine">{{list.title}}</h1>
    <ul>
      <li contenteditable v-for="(todo, idx) in list.items" 
        :data-todo-idx="idx"
        @blur="todoChanged"
        @keypress="preventNewLine"
        @paste="stripNewLine">{{todo}}</li>
      <li contenteditable class="li-add"
        @focus="clearInsert"
        @keypress="keypressedAdd"
        @paste="stripNewLine">{{addContents}}</li>
    </ul>
  </article>`,
  computed: {
    position: function () {
      return {
        left: this.list.pos.x + 'px',
        top: this.list.pos.y + 'px'        
      };
    }
  },
  methods: {
    titleChanged: function (event) {
      let title = $(event.target).text();
      this.list.title = title;
    },
    todoChanged: function (event) {
      let li = $(event.target);
      let todo = li.text();
      let index = parseInt(li.attr('data-todo-idx'));
      Vue.set(this.list.items, index, todo);
    },
    addTodo: function (text) {
      this.list.items.push(text);
    },
    keypressedAdd: function (event) {
      if (event.which != 13) return;
      // Ignores enter key
      event.preventDefault();
      let todo = $(event.target).text();
      if (todo === '') return;
      // Add new todo
      this.addTodo(todo);
      this.addContents = $(event.target).text('');
    },
    preventNewLine: function (event) {
      if (event.which != 13) return;
      // Ignores enter key
      event.preventDefault();
    },
    clearInsert: function () {
      this.addContents = '';
    },
    stripNewLine: function (event) {
      //strips elements added to the editable tag when pasting
      let self = $(this);
      setTimeout(function() { self.html(self.text()); }, 0);
    }
  },
  data: () => ({ hover: false, addContents: 'Todo item' })
});

$(function () {
  let pageView = new Vue({
    el: '#board',
    data: {
      lists: {}
    },
    mounted: function () {
      this.$on('translateList', (id, dx, dy) => {
        this.lists[id].pos.x += dx;
        this.lists[id].pos.y += dy;
      });
      this.$on('startListDrag', id => {
        this.lists[id].dragging = true;
      });
      this.$on('endListDrag', id => {
        this.lists[id].dragging = false;
      });
    },
    methods: {
      addList: function () {
        let key = generateUniqueKey(this.lists);
        Vue.set(this.lists, key, new List());
      }
    }
  });
  
  class List {
    constructor(title) {
      this.title = title || 'List';
      this.items = [];
      this.pos = { x: 0, y: 0 };
      this.dragging = false;
    }
  }
  
  interact('.list')
  .draggable({
    // disable inertial throwing
    inertia: false,
    // keep the element within the area of it's parent
    restrict: {
      restriction: "parent",
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    
    onstart: (event) => pageView.$emit('startListDrag', 
      event.target.getAttribute('data-list-id')),
    onend: (event) => pageView.$emit('endListDrag', 
      event.target.getAttribute('data-list-id')),
    onmove: function (event) {
      pageView.$emit(
        'translateList', 
        event.target.getAttribute('data-list-id'),
        event.dx,
        event.dy
      );
    }
  })
  .preventDefault('never')
  .styleCursor(false);
  
  function generateUniqueKey(object) {
    const randomID = () => Math.random().toString(36).slice(2);
    let key = randomID();
    while (object[key] !== undefined) key = randomID();
    return key;
  }
});