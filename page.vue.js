$(function () {
  Vue.component('list-component', {
    props: ['id', 'list'],
    template: `
    <article class="list mdc-card" v-bind:style="style"
    :class="{ 'mdc-elevation--z4': this.hover && !this.list.dragging,
    'mdc-elevation--z8': this.list.dragging }"
    @mouseover="() => { this.hover = true; }"
    @mouseleave="() => { this.hover = false; }"
    @dblclick="() => this.$emit('dblclick')">
    <div class="card-contents">
    <p contenteditable
    @click="titleClicked"
    @blur="titleChanged"
    @paste="stripNewLine">{{list.title}}</p>
    <button class="delete-icon" @click="() => this.$emit('delete-list', this.id)">
    <i class="material-icons">delete</i>
    </button>
    </div>
    </article>`,
    computed: {
      style: function () {
        return {
          left: this.list.pos.x + 'px',
          top: this.list.pos.y + 'px',
          backgroundColor: this.list.colour
        };
      }
    },
    methods: {
      titleClicked: function (event) {
        if ($(event.srcElement).text() === 'New item') {
          document.execCommand('selectAll',false,null);
        }
      },
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
        if (event.which !== 13) return;
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

  const initialListString = localStorage.getItem('lists');
  let initialLists ;
  if (!initialListString || initialListString === '') {
    initialLists = {};
    localStorage.setItem('lists', JSON.stringify({}));
  } else {
    try {
      initialLists = JSON.parse(initialListString);
    } catch (e) {
      alert('Error parsing lists');
      initialLists = {}
    }
  }

  const LIST_COLOURS = [
    'white',
    'rgb(255, 138, 128)',
    'rgb(255, 209, 128)',
    'rgb(255, 255, 141)',
    'rgb(204, 255, 144)',
    'rgb(167, 255, 235)',
    'rgb(128, 216, 255)',
    'rgb(130, 177, 255)',
    'rgb(179, 136, 255)',
    'rgb(248, 187, 208)',
    'rgb(215, 204, 200)',
    'rgb(207, 216, 220)'
  ];

  function nextColour(colour) {
    return LIST_COLOURS[(LIST_COLOURS.indexOf(colour) + 1) % LIST_COLOURS.length]
  }

  let pageView = new Vue({
    el: '#board',
    data: {
      lists: initialLists
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
        let listStr = localStorage.getItem('lists');
        if (listStr !== JSON.stringify(pageView.lists)) {
          const dialogText = 'Your lists have not been saved.';
          e.returnValue = dialogText;
          return dialogText;
        }
      };
      window.mdc.autoInit();
    },
    methods: {
      addList: function () {
        let key = generateUniqueKey(this.lists);
        const containerRect = this.$el.getBoundingClientRect();
        const listPos = {
          x: containerRect.width / 2 - 46,
          y: containerRect.height / 2 - 22
        };
        Vue.set(this.lists, key, new List(listPos, 'New item'));
        this.$emit('listUpdate');
      },
      deleteList: function (key) {
        Vue.delete(this.lists, key);
        this.$emit('listUpdate');
      },
      changeListColour: function (key) {
        this.lists[key].colour = nextColour(this.lists[key].colour);
        this.$emit('listUpdate');
      }
    }
  });

  class List {
    constructor(startPos = { x: 0, y: 0 }, title = '') {
      this.title = title;
      this.items = [];
      this.pos = startPos;
      this.colour =
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
      return false;
    },
    onend(event) {
      pageView.$emit('endListDrag', event.target.getAttribute('data-list-id'));
      return false;
    },
    onmove(event) {
      pageView.$emit(
        'translateList',
        event.target.getAttribute('data-list-id'),
        event.dx,
        event.dy
      );
      return false;
    }
  })
  .preventDefault('never')
  .on('up', event => pageView.$emit('releaseListDrag', event.target.getAttribute('data-list-id')))
  .styleCursor(false);

  function generateUniqueKey(object) {
    const randomID = () => Math.random().toString(36).slice(2);
    let key = randomID();
    while (object[key] !== undefined) key = randomID();
    return key;
  }
});
