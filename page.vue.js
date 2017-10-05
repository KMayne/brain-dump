$(function () {
  Vue.component('card-component', {
    props: ['card'],
    template: `
      <article class="card mdc-card" :style="style" :class="classes"
        @mouseover="() => this.hover = true"
        @mouseleave="() => this.hover = false"
        @click.ctrl="ctrlClicked">
        <div class="card-contents">
          <p contenteditable @click="contentsClicked" @blur="contentsChanged">
            {{card.contents}}
          </p>
          <button class="delete-icon" @click="deleteClicked">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </article>`,
    computed: {
      style: function () {
        return {
          left: this.card.pos.x + 'px',
          top: this.card.pos.y + 'px',
          backgroundColor: this.card.colour
        };
      },
      classes: function () {
        return {
          'mdc-elevation--z4': this.hover && !this.card.dragging,
          'mdc-elevation--z8': this.card.dragging
        };
      }
    },
    methods: {
      contentsClicked: function (event) {
        if ($(event.srcElement).text() === 'New item') {
          document.execCommand('selectAll', false, null);
        }
      },
      contentsChanged: function (event) {
        let contents = $(event.target).text();
        this.card.contents = contents;
        pageVue.$emit('cardUpdate');
      },
      deleteClicked: function () {
        this.$emit('delete-card');
      },
      ctrlClicked: function () {
        this.$emit('change-card-colour');
      }
    },
    data: () => ({ hover: false })
  });

  function getNewDumpName() {
    return (new Date()).toString().split(' ').slice(0, 5).join(' ');
  }

  if (localStorage.getItem('version') !== '1') {
    localStorage.setItem('version', '1');
    localStorage.setItem('cards', JSON.stringify({}));
    localStorage.setItem('dumpName', getNewDumpName());
    localStorage.setItem('showGrid', 'false');
    localStorage.setItem('dumps', '{}');
  }

  const initialCards = JSON.parse(localStorage.getItem('cards'));
  let initialDumpName = localStorage.getItem('dumpName');
  const initialShowGrid = JSON.parse(localStorage.getItem('showGrid'));
  const initialDumps = JSON.parse(localStorage.getItem('dumps'));

  const CARD_COLOURS = [
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
  CARD_COLOURS.next = colour => CARD_COLOURS[(CARD_COLOURS.indexOf(colour) + 1) % CARD_COLOURS.length];

  const pageVue = window.pageVue = new Vue({
    el: '#vueRoot',
    data: {
      cards: initialCards,
      dumpName: initialDumpName,
      dumps: initialDumps,
      showGrid: initialShowGrid,
      newDumpName: ''
    },
    mounted: function () {
      this.$on('translateCard', (id, dx, dy) => {
        this.cards[id].pos.x += dx;
        this.cards[id].pos.y += dy;
      });
      this.$on('startCardDrag', id => {
        this.cards[id].dragging = true;
      });
      this.$on('endCardDrag', id => {
        this.cards[id].dragging = false;
        this.$emit('cardUpdate');
      });
      this.$on('cardUpdate', () => window.localStorage.setItem('cards', JSON.stringify(this.cards)));
      this.dumpSelectionDialog = new mdc.dialog.MDCDialog(document.querySelector('#dump-selection-dialog'));
      this.newDumpDialog = new mdc.dialog.MDCDialog(document.querySelector('#new-dump-dialog'));
      this.newDumpDialog.listen('MDCDialog:accept', () => this.switchDump(this.newDumpName));

      this.$emit('cardUpdate');
      window.onbeforeunload = function handleUnload(e) {
        let cardStr = localStorage.getItem('cards');
        if (cardStr !== JSON.stringify(pageVue.cards)) {
          const dialogText = 'Your cards have not been saved.';
          e.returnValue = dialogText;
          return dialogText;
        }
      };
      window.mdc.autoInit();
    },
    methods: {
      addCard: function () {
        let key = generateUniqueKey(this.cards);
        const containerRect = this.$el.getBoundingClientRect();
        const cardPos = {
          x: containerRect.width / 2 - 46,
          y: containerRect.height / 2 - 22
        };
        Vue.set(this.cards, key, new Card(cardPos, 'New item'));
        this.$emit('cardUpdate');
      },
      deleteCard: function (key) {
        Vue.delete(this.cards, key);
        this.$emit('cardUpdate');
      },
      changeCardColour: function (key) {
        this.cards[key].colour = CARD_COLOURS.next(this.cards[key].colour);
        this.$emit('cardUpdate');
      },
      newDump: function () {
        this.dumpSelectionDialog.close();
        this.newDumpName = '';
        this.newDumpDialog.show();
      },
      switchDump: function (dumpName) {
        this.dumps[this.dumpName] = this.cards;
        this.dumpName = dumpName || getNewDumpName();
        this.cards = this.dumps[dumpName] || {};
        delete this.dumps[dumpName];
        this.$emit('cardUpdate');
        localStorage.setItem('dumpName', this.dumpName);
        localStorage.setItem('dumps', JSON.stringify(this.dumps));
      }
    },
    watch: {
      showGrid: function (showGrid) {
        localStorage.setItem('showGrid', JSON.stringify(showGrid));
      }
    }
  });

  class Card {
    constructor(startPos = { x: 0, y: 0 }, contents = '') {
      this.contents = contents;
      this.pos = startPos;
      this.colour =
      this.dragging = false;
    }
  }

  interact('.card')
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
      pageVue.$emit('startCardDrag', event.target.getAttribute('data-card-id'));
      return false;
    },
    onend(event) {
      pageVue.$emit('endCardDrag', event.target.getAttribute('data-card-id'));
      return false;
    },
    onmove(event) {
      pageVue.$emit(
        'translateCard',
        event.target.getAttribute('data-card-id'),
        event.dx,
        event.dy
      );
      return false;
    }
  })
  .preventDefault('never')
  .on('up', event => pageVue.$emit('releaseCardDrag', event.target.getAttribute('data-card-id')))
  .styleCursor(false);

  function generateUniqueKey(object) {
    const randomID = () => Math.random().toString(36).slice(2);
    let key = randomID();
    while (object[key] !== undefined) key = randomID();
    return key;
  }
});
