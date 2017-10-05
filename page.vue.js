$(function () {
  Vue.component('card-component', {
    props: ['id', 'card'],
    template: `
    <article class="card mdc-card" v-bind:style="style"
    :class="{ 'mdc-elevation--z4': this.hover && !this.card.dragging,
    'mdc-elevation--z8': this.card.dragging }"
    @mouseover="() => { this.hover = true; }"
    @mouseleave="() => { this.hover = false; }"
    @dblclick="() => this.$emit('dblclick')">
    <div class="card-contents">
    <p contenteditable
    @click="contentsClicked"
    @blur="contentsChanged">{{card.contents}}</p>
    <button class="delete-icon" @click="() => this.$emit('delete-card', this.id)">
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
        pageView.$emit('cardUpdate');
      }
    },
    data: () => ({ hover: false, addContents: 'Todo item' })
  });

  const initialCardString = localStorage.getItem('cards');
  let initialCards;
  if (!initialCardString || initialCardString === '') {
    initialCards = {};
    localStorage.setItem('cards', JSON.stringify(initialCards));
  } else {
    try {
      initialCards = JSON.parse(initialCardString);
    } catch (e) {
      alert('Error parsing cards');
      initialCards = {}
    }
  }

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

  function nextColour(colour) {
    return CARD_COLOURS[(CARD_COLOURS.indexOf(colour) + 1) % CARD_COLOURS.length]
  }

  let pageView = new Vue({
    el: '#board',
    data: {
      cards: initialCards
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
      this.$emit('cardUpdate');
      window.onbeforeunload = function handleUnload(e) {
        let cardStr = localStorage.getItem('cards');
        if (cardStr !== JSON.stringify(pageView.cards)) {
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
        this.cards[key].colour = nextColour(this.cards[key].colour);
        this.$emit('cardUpdate');
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
      pageView.$emit('startCardDrag', event.target.getAttribute('data-card-id'));
      return false;
    },
    onend(event) {
      pageView.$emit('endCardDrag', event.target.getAttribute('data-card-id'));
      return false;
    },
    onmove(event) {
      pageView.$emit(
        'translateCard',
        event.target.getAttribute('data-card-id'),
        event.dx,
        event.dy
      );
      return false;
    }
  })
  .preventDefault('never')
  .on('up', event => pageView.$emit('releaseCardDrag', event.target.getAttribute('data-card-id')))
  .styleCursor(false);

  function generateUniqueKey(object) {
    const randomID = () => Math.random().toString(36).slice(2);
    let key = randomID();
    while (object[key] !== undefined) key = randomID();
    return key;
  }
});
