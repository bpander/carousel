define(function (require) {
    'use strict';

    var $ = require('jquery');
    var jsondiffpatch = require('jsondiffpatch');
    require('matchmedia');
    require('matchmedia.addlistener');
    require('velocity');


    /**
     * A sliding carousel.
     *
     * @class Carousel
     * @constructor
     * @param {jQuery} $element  Maps to the $element instance property.
     * @param {Object} options   Overrides default options.
     *
     * @todo Some browsers seem to have problems dealing with subpixels and translateX (lookin' at you, Chrome). It might be better to just use translateX for animations, but switch to 'left' when the carousel is paused (since 'left' is less likely to cause sub-pixel rounding issues).
     */
    function Carousel ($element, options) {

        /**
         * The main and root element of this carousel (wrapped in jQuery)
         *
         * @property carousel.$element
         * @type {jQuery}
         */
        this.$element = $element;

        /**
         * Carousel configuration options.
         *
         * @property carousel.options
         * @type {Object}
         */
        this.options = $.extend({}, _defaults, options);

        /**
         * The flattened options object with breakpoint overrides applied.
         *
         * @property carousel._flattenedOptions
         * @private
         * @type {Object}
         */
        this._flattenedOptions = {};

        /**
         * The element that moves the slides left or right (wrapped in jQuery)
         *
         * @property carousel.$actuator
         * @type {jQuery}
         */
        this.$actuator = $element.find('[data-carousel-role="actuator"]');

        /**
         * TODO
         */
        this.$dotContainer = $element.find('[data-carousel-role="dotContainer"]');

        /**
         * A button that when clicked will decrement the slider by the number defined in the instance's `options.slidesToScroll` property.
         *
         * @property carousel.$previousButton
         * @type {jQuery}
         */
        this.$previousButton = $element.find('[data-carousel-role="previousButton"]');

        /**
         * A button that when clicked will increment the slider by the number defined in the instance's `options.slidesToScroll` property.
         *
         * @property carousel.$previousButton
         * @type {jQuery}
         */
        this.$nextButton = $element.find('[data-carousel-role="nextButton"]');

        /**
         * The individual carousel slides (wrapped in jQuery)
         *
         * @property carousel.$slide
         * @type {jQuery}
         */
        this.$slide = $element.find('[data-carousel-role="slide"]');

        /**
         * The cloned slides on the left side of the original carousel slides (wrapped in jQuery) (used to create the illusion that this is an infinitely scrolling carousel).
         *
         * @property carousel.$cloneLeft
         * @type {jQuery}
         */
        this.$cloneLeft = this.$slide.clone();

        /**
         * The cloned slides on the left side of the original carousel slides (wrapped in jQuery) (used to create the illusion that this is an infinitely scrolling carousel).
         *
         * @property carousel.$cloneRight
         * @type {jQuery}
         */
        this.$cloneRight = this.$slide.clone();

        /**
         * The interval id for autoplaying.
         *
         * @property carousel.autoplayIntervalId
         * @type {Number}
         * @default -1
         */
        this.autoplayIntervalId = -1;

        /**
         * A flag indicating whether or not the instance is currently advancing
         *
         * @property carousel.isAdvancing
         * @type {Boolean}
         * @default false
         */
        this.isAdvancing = false;

        /**
         * The instance's current slide index
         *
         * @property carousel.slideIndex
         * @type {Number}
         * @default 0
         */
        this.slideIndex = 0;

        this.handleDotClick = this.handleDotClick.bind(this);
        this.handleMediaQueryChange = this.handleMediaQueryChange.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handlePreviousButtonClick = this.handlePreviousButtonClick.bind(this);
        this.handleNextButtonClick = this.handleNextButtonClick.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);

        this.init();
    }


    var _defaults = {

        /**
         * If set to `true`, the carousel will autoplay.
         * 
         * @property carousel.options.autoplay
         * @type {Boolean}
         * @default true
         */
        autoplay: true,

        /**
         * TODO
         */
        dots: false,

        /**
         * The duration in milliseconds that an autoplaying carousel will wait before advancing
         *
         * @property carousel.options.pauseDuration
         * @type {Number}
         * @default 5000
         */
        pauseDuration: 5000,

        /**
         * The easing method to use when transitioning. See velocity.js's documentation for possible easing values.
         *
         * @property carousel.options.easing
         * @type {String}
         * @default 'ease-out'
         */
        easing: 'ease-out',

        /**
         * If set to `true`, the Carousel instance will pause autoplaying while the user is hovering over the main carousel element
         *
         * @property carousel.options.pauseOnHover
         * @type {Boolean}
         * @default true
         */
        pauseOnHover: true,

        /**
         * An array of media queries and their accompanying option overrides.
         *
         * @property carousel.options.breakpoints
         * @type {Array}
         */
        breakpoints: [
            {
                /**
                 * A mediaQueryString e.g. "(max-width: 768px)". When this media query gets matched, its accompanying options object becomes active, overriding non-breakpoint options.
                 *
                 * @property carousel.options.breakpoints[].mediaQueryString
                 * @type {String}
                 */
                mediaQueryString: '',

                /**
                 * An object with options to override non-breakpoint options when the media query is matched, e.g. `{ slidesToShow: 3 }`
                 *
                 * @property carousel.options.breakpoints[].options
                 * @type {Object}
                 */
                options: {}
            }
        ],

        /**
         * The number of slides to show at once.
         *
         * @property carousel.options.slidesToShow
         * @type {Number}
         * @default 1
         */
        slidesToShow: 1,

        /**
         * The number of slides to scroll at once.
         *
         * @property carousel.options.slidesToScroll
         * @type {Number}
         * @default 1
         */
        slidesToScroll: 1,

        /**
         * If set to `true`, the Carousel instance will respond to touch and swipe events.
         *
         * @property carousel.options.swipeable
         * @type {Boolean}
         * @default true
         * @todo  Not yet implemented.
         */
        swipeable: true,

        /**
         * The number of milliseconds it takes for the slide transition to complete.
         *
         * @property carousel.options.transitionDuration
         * @type {Number}
         * @default 400
         */
        transitionDuration: 400
    };


    /**
     * The minimum number of pixels between the last two touchmove events while swiping to trigger a swipe
     *
     * @property Carousel.SWIPE_THRESHOLD
     * @final
     * @type {Number}
     * @default 10
     */
    Carousel.SWIPE_THESHOLD = 10;


    Carousel.DOT_CLASS = 'carousel-dot';

    Carousel.dotTemplate = '<button class="' + Carousel.DOT_CLASS + '"></button>'


    Carousel.prototype.init = function () {
        this.$cloneLeft.insertBefore(this.$slide.first());
        this.$cloneRight.insertAfter(this.$slide.last());

        // Prevent screen-readers from caring about the clones
        this.$cloneLeft.add(this.$cloneRight).attr('aria-hidden', true);

        this.set(this.options);
        this.enable();
    };


    /**
     * Re-layouts the Carousel instance.
     *
     * @method carousel.layout
     */
    Carousel.prototype.layout = function () {
        var slideWidth = 1 / this._flattenedOptions.slidesToShow;
        this.$slide.add(this.$cloneLeft).add(this.$cloneRight).css('width', slideWidth * 100 + '%');
        $.Velocity.hook(this.$actuator, 'translateX', this.getActuatorOffsetAtIndex(this.slideIndex));
        this.$slide.removeClass('active').eq(this.slideIndex).addClass('active');

        // Dots
        var dotCount = this._flattenedOptions.dots === true ? Math.ceil(this.$slide.length / this._flattenedOptions.slidesToScroll) : 0;
        var i = -1;
        this.$dotContainer.empty();
        while (++i < dotCount) {
            this.$dotContainer.append(Carousel.dotTemplate);
        }
    };


    /**
     * Enables DOM event listeners.
     *
     * @method carousel.enable
     */
    Carousel.prototype.enable = function () {
        this.$element.on('mouseenter', this.handleMouseEnter);
        this.$element.on('mouseleave', this.handleMouseLeave);
        this.$slide.add(this.$cloneLeft).add(this.$cloneRight).on('touchstart', this.handleTouchStart);
        this.$previousButton.on('click', this.handlePreviousButtonClick);
        this.$nextButton.on('click', this.handleNextButtonClick);
        this.$dotContainer.on('click', '.' + Carousel.DOT_CLASS, this.handleDotClick);
    };


    /**
     * Disables DOM event listeners.
     *
     * @method carousel.disable
     */
    Carousel.prototype.disable = function () {
        this.$element.off('mouseenter', this.handleMouseEnter);
        this.$element.off('mouseleave', this.handleMouseLeave);
        this.$slide.add(this.$cloneLeft).add(this.$cloneRight).off('touchstart', this.handleTouchStart);
        this.$previousButton.off('click', this.handlePreviousButtonClick);
        this.$nextButton.off('click', this.handleNextButtonClick);
        this.$dotContainer.off('click', '.' + Carousel.DOT_CLASS, this.handleDotClick);
    };


    /**
     * A setter to update a Carousel instance's options. Use this method to update options since it'll handle updating anything that's affected by changing a given option, e.g. calling `.layout` if options.slidesToShow is changed.
     *
     * @method carousel.set
     * @param {Object} options  An object used to overwrite currently applied options, e.g. `{ autoplay: false }` will turn autoplay off.
     */
    /**
     * An alternate way of calling `carousel.set`.
     *
     * @method carousel.set
     * @param {String} optionKey   The option to change, e.g. 'slidesToShow'
     * @param {*}      optionValue The new value of the option, e.g. 4
     */
    Carousel.prototype.set = function (options) {
        if (options instanceof Object === false) {
            var obj = {};
            obj[arguments[0]] = arguments[1];
            this.set(obj);
            return;
        }

        $.extend(this.options, options);
        this.updateFlattenedOptions();
    };


    /**
     * Calculates the options object with the breakpoints' options applied.
     *
     * @method carousel.getFlattenedOptions
     * @return {Object}  The flattened options object
     */
    Carousel.prototype.getFlattenedOptions = function () {
        var matchingBreakpoints = this.getMatchingBreakpoints();
        var breakpointOptionSets = matchingBreakpoints.map(function (breakpoint) {
            return breakpoint.options;
        });
        return $.extend.apply(null, [{}, this.options].concat(breakpointOptionSets));
    };


    /**
     * Disables an array of breakpoints.
     *
     * @method carousel.disableBreakpoints
     * @param  {Object[]} breakpoints  An array of breakpoint definitions to disable (see carousel.options.breakpoints).
     */
    Carousel.prototype.disableBreakpoints = function (breakpoints) {
        var breakpoint;
        var i = -1;
        while ((breakpoint = breakpoints[++i]) !== undefined) {
            breakpoint.mql.removeListener(this.handleMediaQueryChange);
        }
    };


    /**
     * Register an array of breakpoints.
     *
     * @method carousel.registerBreakpoints
     * @param  {Object[]} breakpoints  An array of breakpoint definitions to register (see carousel.options.breakpoints).
     */
    Carousel.prototype.registerBreakpoints = function (breakpoints) {
        var breakpoint;
        var i = -1;
        while ((breakpoint = breakpoints[++i]) !== undefined) {
            breakpoint.mql = window.matchMedia(breakpoint.mediaQueryString);
            breakpoint.mql.addListener(this.handleMediaQueryChange);
        }
    };


    /**
     * Pluck the currently active breakpoint definitions.
     *
     * @method carousel.getMatchingBreakpoints
     * @return {Object[]}
     */
    Carousel.prototype.getMatchingBreakpoints = function () {
        return this.options.breakpoints.filter(function (breakpoint) {
            return window.matchMedia(breakpoint.mediaQueryString).matches;
        });
    };


    Carousel.prototype.getActuatorOffsetAtIndex = function (slideIndex) {
        var slideWidth = 1 / this._flattenedOptions.slidesToShow;
        return ((slideIndex + this.$slide.length) * slideWidth) * -100 + '%';
    };


    Carousel.prototype.advance = function (howMany) {
        if (this.isAdvancing) {
            return $.Deferred().reject();
        }
        howMany = (howMany !== undefined) ? howMany : 1;
        var self = this;
        var slideCount = this.$slide.length;
        var targetIndex = this.slideIndex + howMany;
        var isLoopingAround = targetIndex < 0 || targetIndex >= slideCount;
        var handleTransitionEnd = function () {
            if (isLoopingAround) {
                $.Velocity.hook(self.$actuator, 'translateX', self.getActuatorOffsetAtIndex(self.slideIndex));
            }
            self.isAdvancing = false;
        };
        this.isAdvancing = true;
        this.slideIndex = targetIndex % slideCount;
        if (this.slideIndex < 0) {
            this.slideIndex += slideCount;
        }

        this.$actuator.velocity('stop');
        return $.when(this.$actuator.velocity(
            { translateX: this.getActuatorOffsetAtIndex(targetIndex) },
            {
                duration: this._flattenedOptions.transitionDuration,
                easing: this._flattenedOptions.easing
            }
        )).then(handleTransitionEnd);
    };


    Carousel.prototype.goTo = function (slideIndex) {
        var howMany = slideIndex - this.slideIndex;
        return this.advance(howMany);
    };


    Carousel.prototype.autoplay = function () {
        clearInterval(this.autoplayIntervalId);
        this.autoplayIntervalId = setInterval(this.next.bind(this), this._flattenedOptions.pauseDuration);
    };


    Carousel.prototype.stop = function () {
        clearInterval(this.autoplayIntervalId);
    };


    Carousel.prototype.previous = function () {
        return this.advance(this._flattenedOptions.slidesToScroll * -1);
    };


    Carousel.prototype.next = function () {
        return this.advance(this._flattenedOptions.slidesToScroll);
    };


    Carousel.prototype.updateFlattenedOptions = function () {
        var delta;
        var flattenedOptionsPrevious = this._flattenedOptions;
        this._flattenedOptions = this.getFlattenedOptions();
        delta = jsondiffpatch.diff(flattenedOptionsPrevious, this._flattenedOptions);

        if (delta.autoplay !== undefined || delta.pauseDuration !== undefined) {
            this._flattenedOptions.autoplay ? this.autoplay() : this.stop();
        }
        if (delta.breakpoints !== undefined) {
            if (flattenedOptionsPrevious instanceof Array) {
                this.disableBreakpoints(flattenedOptionsPrevious.breakpoints);
            }
            this.registerBreakpoints(this._flattenedOptions.breakpoints);
        }
        if (delta.slidesToShow !== undefined || delta.dots !== undefined) {
            this.layout();
        }
    };


    Carousel.prototype.handleMediaQueryChange = function () {
        this.updateFlattenedOptions();
    };


    Carousel.prototype.handleMouseEnter = function () {
        if (this._flattenedOptions.pauseOnHover) {
            this.stop();
        }
    };


    Carousel.prototype.handleMouseLeave = function () {
        if (this._flattenedOptions.autoplay && this._flattenedOptions.pauseOnHover) {
            this.autoplay();
        }
    };


    Carousel.prototype.handleNextButtonClick = function () {
        this.next();
    };


    Carousel.prototype.handlePreviousButtonClick = function () {
        this.previous();
    };


    Carousel.prototype.handleTouchStart = function (e) {
        if (this._flattenedOptions.swipeable === false || this.isAdvancing) {
            return;
        }
        this.stop(); // Prevent autoplay while dragging
        var self = this;
        var touch = e.originalEvent.touches[0];
        var x = touch.clientX;
        var delta;

        // Before we do anything else, we have to convert the translateX value to pixels to make the dragging math easier
        var translateX = parseInt($.Velocity.hook(this.$actuator, 'translateX'), 10) / 100 * this.$actuator.parent().width();
        $.Velocity.hook(this.$actuator, 'translateX', translateX);
        $.Velocity.hook(this.$actuator, 'translateZ', 0); // Enable hardware acceleration while dragging

        var handleTouchMove = function (e) {
            var xCurrent = e.touches[0].clientX;
            e.preventDefault();
            delta = xCurrent - x;
            translateX = translateX + delta;
            $.Velocity.hook(self.$actuator, 'translateX', translateX + 'px');
            x = xCurrent;
        };
        var handleTouchEnd = function (e) {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            var width = self.$slide.width();
            var slideIndex = Math.round(translateX / width * -1) - self.$slide.length;
            if (Math.abs(delta) >= Carousel.SWIPE_THESHOLD) {
                slideIndex = slideIndex - Math.min(Math.max(delta, -1), 1);
            }
            self.goTo(slideIndex);
            if (self._flattenedOptions.autoplay) {
                self.autoplay();
            }
        };
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
    };


    Carousel.prototype.handleDotClick = function (e) {
        var dotIndex = $(e.currentTarget).index();
        var slideIndex = Math.min(dotIndex * this._flattenedOptions.slidesToScroll, this.$slide.length - this._flattenedOptions.slidesToShow);
        this.goTo(slideIndex);
    };


    return Carousel;
});
