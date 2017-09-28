$(function () {
  Vue.component('list-component', {
  props: ['id', 'list'],
  template: `
  <article class="list mdc-card" v-bind:style="position"
    :class="{ 'mdc-elevation--z4': this.hover && !this.list.dragging,
              'mdc-elevation--z8': this.list.dragging }"
    @mouseover="() => { this.hover = true; }"
    @mouseleave="() => { this.hover = false; }">
    <div class="card-contents">
      <p contenteditable
        @blur="titleChanged"
        @paste="stripNewLine">{{list.title}}</p>
      <i class="material-icons delete-icon" @click="() => this.$emit('delete-list', this.id)">delete</i></a>
    </div>
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
      pageView.$emit('listUpdate');
    },
    todoChanged: function (event) {
      let li = $(event.target);
      let todo = li.text();
      let index = parseInt(li.attr('data-todo-idx'));
      Vue.set(this.list.items, index, todo);
      pageView.$emit('listUpdate');
    },
    addTodo: function (text) {
      this.list.items.push(text);
      pageView.$emit('listUpdate');
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

  const initialListString = window.localStorage.getItem('lists');
  let initalLists;
  if (!initialListString) {
    initialLists = {};
  } else {
    try {
      initalLists = JSON.parse(initialListString);
    } catch (e) {
      alert('Error parsing lists');
      initalLists = {}
    }
  }

  let pageView = new Vue({
    el: '#board',
    data: {
      lists: initalLists
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
        this.$emit('listUpdate');
      });
      this.$on('listUpdate', () => window.localStorage.setItem('lists', JSON.stringify(this.lists)));
      this.$emit('listUpdate');
      window.onbeforeunload = function handleUnload(e) {
        let listStr = window.localStorage.getItem('lists');
         if (listStr !== JSON.stringify(pageView.lists)) {
          const dialogText = 'Your lists have not been saved.';
          e.returnValue = dialogText;
          return dialogText;
        }
      };
    },
    methods: {
      addList: function () {
        let key = generateUniqueKey(this.lists);
        Vue.set(this.lists, key, new List());
        this.$emit('listUpdate');
      },
      deleteList: function (key) {
        Vue.delete(this.lists, key);
        this.$emit('listUpdate');
      }
    }
  });

  class List {
    constructor(title) {
      this.title = title || 'Item';
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

    autoscroll: true,

    onstart(event) {
      pageView.$emit('startListDrag', event.target.getAttribute('data-list-id'));
    },
    onend(event) {
      pageView.$emit('endListDrag', event.target.getAttribute('data-list-id'));
    },
    onmove(event) {
      pageView.$emit(
        'translateList',
        event.target.getAttribute('data-list-id'),
        event.dx,
        event.dy
      );
    }
  })
  // .preventDefault('never')
  .on('up', event => pageView.$emit('releaseListDrag', event.target.getAttribute('data-list-id')))
  .styleCursor(false);

  function generateUniqueKey(object) {
    const randomID = () => Math.random().toString(36).slice(2);
    let key = randomID();
    while (object[key] !== undefined) key = randomID();
    return key;
  }
});
