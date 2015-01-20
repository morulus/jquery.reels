/* 
Универсальный слайдер.
Для использования необходимо создать следующую стрктуру элементов
<div id="slider">
	<div>
		
	</div>
</div>
*/
;(function($) {
	var reels = function(selector, options) {
		this.options = $.extend({
			duration: 650,
			css3: 'auto',
			triggers: false, // jQuery objects, selector or array,
			autoplay: false, // false ot integer value (ms)
			infinity: true, // Infinity photos (repeats for ever). The amount should be between 3!
			init: false, // Execute this function before initial in context
			listen: false, // Listen for another slider and copy its actions
			touch: true, // Enable touch events
			minReloadDelay: 0 // Delay between user events
		}, options || {});
		this.nodes = {
			slider: selector,
			reels: null,
			train: null
		};
		this.services = {

		};
		this.scope = {
			currentSlide: null,
			currentShift: 0,
			transShift: 0, // Hidden shift
			'_': { // Dirty way

			},
			readyToGo: true,
			onNeighborReady: false,
			requireReInit: true,
			autoplayer: false
		};
		this.eventListners = {};
		this.bind = function(e, callback, once) {
			var once = once;
			if (typeof this.eventListners[e] != 'object') this.eventListners[e] = [];
			this.eventListners[e].push({
				callback: callback,
				once: once
			});
			return this;
		};
		this.trigger = function() {
			if (typeof arguments[0] == 'integer') {
				var uin = arguments[0];
				var e = arguments[1];
				var args = (arguments.length>2) ? arguments[2] : [];
			} else {
				var uin = false;
				var e = arguments[0];
				var args = (arguments.length>1) ? arguments[1] : [];
			};
			
			if (typeof this.eventListners[e] == 'object' && this.eventListners[e].length>0) {
				var todelete = [];
				for (var i = 0; i<this.eventListners[e].length; i++) {
					if (typeof this.eventListners[e][i] == 'object') {
						if (typeof this.eventListners[e][i].callback == "function") this.eventListners[e][i].callback.apply(this, args);
						if (this.eventListners[e][i].once) {
							todelete.push(i);
						};
					};
				};
				
				if (todelete.length>0) for (var i in todelete) {
					this.eventListners[e].splice(todelete[i], 1);
				};
			};
			return this;
		};
		this.init = function(service) {
			var service = service || 'main';
			this.modules[service].apply(this);
		}
		// Замер размеров слайдов, необходимо производить каждый раз при смене размеров контейнера
		this.recalc = function(callback) {
			var that = this;
			this.scope.slides = [];
			this.scope.slidesMap = {};
			$(this.nodes.train).find('>*').each(function() {
				
				that.scope.slides.push({
					width: $(this).width()
				});
			});
			if (!$(this.nodes.train).is(':visible')) {
				this.scope.requireReInit = true;
			} else {
				this.scope.requireReInit = false;
			};

			this.trigger('change'); // Call change event after recalc

			// Проверка. Если у нас слайдов менее 4, то мы выставляет паузу между возможными пользовательскими действиями равными половине времени движения слайда
			if (this.scope.slides.length<4) this.options.minReloadDelay = Math.round(this.options.duration/2);
			else this.options.minReloadDelay = 0;

			if ("function"==typeof callback) callback.apply(this);
		}
		this.autoplay = function(delay) {
			var that = this;
			if (delay||false) this.options.autoplay = delay;
			this.scope.autoplayer = setInterval(function() {
				that.next(true);
			}, this.options.autoplay);
		}
		this.disableAnimation = function() {
			
			if ("undefined"===typeof this.scope._.duration) this.scope._.duration = this.options.duration;
			this.options.duration = 0;
			if (this.options.css3) {
				
				$(this.nodes.train).removeClass('-reels-transited');
				$(this.nodes.train).css({
					'-webkit-transition-duration': '0ms',
					'-ms-transition-duration': '0ms',
					'-o-transition-duration': '0ms',
					'-moz-transition-duration': '0ms',
					'transition-duration': '0ms'
				});
			};
		};
		this.enableAnimation = function() {
			if ("undefined"!=typeof this.scope._.duration) this.options.duration = this.scope._.duration;

			if (this.options.css3) {
				
				$(this.nodes.train).addClass('-reels-transited');
				$(this.nodes.train).css({
					'-webkit-transition-duration': this.options.duration+'ms',
					'-ms-transition-duration': this.options.duration+'ms',
					'-o-transition-duration': this.options.duration+'ms',
					'-moz-transition-duration': this.options.duration+'ms',
					'transition-duration': this.options.duration+'ms'
				});
			};
		}
		this.userPrev = function() {
			// Невозможность выполнить действие за минимальный блокирующий промежуток времени
			if (this._getSlidePassedTime()<this.options.minReloadDelay) return false;

			if (this.options.autoplay) {
				console.log('disable autoplay');
				if (this.scope.autoplayer) clearInterval(this.scope.autoplayer);
				this.options.autoplay = false;
			}
			this.prev();
		};
		this.userNext = function() {
			// Невозможность выполнить действие за минимальный блокирующий промежуток времени
			if (this._getSlidePassedTime()<this.options.minReloadDelay) return false;

			if (this.options.autoplay) {

				if (this.scope.autoplayer) clearInterval(this.scope.autoplayer);
				this.options.autoplay = false;
			}
			this.next();
		};
		this.prev = function(callback) {

			if (!this.options.css3 && this.scope.animated) {
				
				return false;
			}

			this.trigger('prev');

			var prev = this.scope.currentSlideIndex-1;
			if (prev<0) prev = this.scope.slides.length-1;
			this.goto(prev, callback || false);
		}
		this.next = function(callback) {
			if (!this.options.css3 && this.scope.animated) {
				
				return false;
			}
			this.trigger('next');
			var next = this.scope.currentSlideIndex+1;
			if (next>=this.scope.slides.length) next = 0;

			this.goto(next, callback || false);
		}
		this.jumptoElement = function(slide, callback) {
			var callback = callback || false;
			this.goto($(slide).index(), callback, true);
			return this;
		}
		this.translateX = function(x) {
			$(this.nodes.train).css({
				"-webkit-transform": "translate3d("+x+'px,0,0)',
				"-o-transform": "translate3d("+x+'px,0,0',
				"-moz-transform": "translate3d("+x+'px,0,0',
				"-ms-transform": "translate3d("+x+'px,0,0',
				"transform": "translate3d("+x+'px,0,0'
			});
		};
		this._move = function(callback, instantly) {
			var that = this;
			var instantly = instantly || false;
			var callback = callback || false;
			
			this._beforeAnimationStart(function() {
				if (instantly) that.disableAnimation();

				if (that.options.css3) {
					
					// css3 mode
					// осуществояем движение поезда по рельсам за счет css3 transitions
					// отсчет времени останова по событиям transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd
					// активация onAnimationEnd по завершении
					that.translateX(that.scope.currentShift*-1);
					
					if (that.options.duration===0) {
						// При моментальном переходе - моментальный вызов callback и onAnimationEnd
						if ("function"==typeof callback) callback();
						
						setTimeout(function() { that._onAnimationEnd(); }, 100);
					} else $(that.nodes.train).one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
						// При включенной задержке вызов callback-функции и onAnimationEnd по возникновению событий окончания транзакций
						
						if ("function"==typeof callback) callback();
						that._onAnimationEnd();
					});
				} else {
					// при отключенной опции css3 анимация проводится старым способом через покадровую анимацию jQuery
					$(that.nodes.train).animate({"margin-left": (that.scope.currentShift*-1)+'px'}, that.options.duration, function() {
						if ("function"==typeof callback) callback();
						that._onAnimationEnd();
					});
				};
			});
		}
		this._getSlidePassedTime = function() {
			return (new Date().getTime())-this.scope.startTime;
		}
		this._onComplete = function(callback) {
			
			var that = this;
			var callback = callback || false;
			that.scope.animated = false;
			
			var endTime = new Date().getTime();
			
			if ("function"==typeof callback) callback.call(that, endTime-this.scope.startTime);
		}
		this._beforeAnimationStart = function(callback) {
			var that = this;
			var callback = callback || false;
			if (that.options.infinity) {
						
				if ($(that.scope.currentSlide).is(":last-child")) {

					// Если текущий тэг последний в списке, мы должны взять элемент из начала и подставить в конец
					// При этом конечно происходит сдвиг положения поезда ровно на ширину слайда
					var fch = $(that.nodes.train).find('>*:first-child');
					$(fch).appendTo($(that.nodes.train));
					// 
					var firstKey = that.scope.slides.splice(0,1);
					that.scope.slides.push(firstKey[0]);
					//
					this.scope.currentSlideIndex--;

					that.scope.transShift = that.scope.transShift-$(fch).outerWidth();
					
					if (this.options.css3) {
						
						$(that.nodes.train).css({
							"margin-left": (that.scope.transShift*-1)+'px',
							"margin-right": (that.scope.transShift)+'px',
							"-webkit-animation-fill-mode": "forward"
						});

					} else {
						// Mofif that.scope.currentShift
						that.scope.currentShift += that.scope.transShift;
						// Modif reels margin when no css3 mode
						$(that.nodes.train).css({
							"margin-left": ((that.scope.currentShift+(that.scope.transShift))*-1)+'px'
						});
						// zeroing trans shift if it's not css3 mode
						if (!that.options.css3)	that.scope.transShift = 0;
						
					};
				} else if ($(that.scope.currentSlide).is(":first-child")) {
					// Если текущий тэг последний в списке, мы должны взять элемент из начала и подставить в конец
					// При этом конечно происходит сдвиг положения поезда ровно на ширину слайда
					var fch = $(that.nodes.train).find('>*:last-child');							
					$(fch).prependTo($(that.nodes.train));
					// 
					var lastKey = that.scope.slides.splice(that.scope.slides.length-1,1);
					that.scope.slides.unshift(lastKey[0]);
					//
					this.scope.currentSlideIndex++;

					that.scope.transShift = that.scope.transShift+$(fch).outerWidth();
						
					if (this.options.css3) {
						$(that.nodes.train).css({
							"margin-left": (that.scope.transShift*-1)+'px',
							"margin-right": (that.scope.transShift)+'px'
						});
					} else {
						// Mofif that.scope.currentShift
						that.scope.currentShift += that.scope.transShift;
						// Modif reels margin when no css3 mode
						$(that.nodes.train).css({
							"margin-left": ((that.scope.currentShift+(that.scope.transShift))*-1)+'px'
						});
						// zeroing trans shift if it's not css3 mode
						if (!that.options.css3)	that.scope.transShift = 0;
					};
					
				};
			};
			if ("function"==typeof callback) callback.apply(this);
		}
		this._onAnimationEnd = function(callback) {
				
				var that = this;
				var callback = callback || false;
				that.enableAnimation();
				// Поддержка бесконечного пролистывания
				
				that._onComplete();
		};
		this.gotoElement = function(element) {
			console.log('goto element');
			this.goto($(element).index());
		};
		this.goto = function(index, callback, instantly) {
			
			var instantly = instantly || false;
			var callback = callback || false;
			var index = "undefined"!=typeof index ? index : this.scope.currentSlideIndex;
			var that = this;

			// Calc realtime
			this.scope.startTime = new Date().getTime();

			if (!this.options.css3 && this.scope.animated) return false; 
			
			that.scope.currentSlideIndex = index;

			var calcs = function() {
				// Get element index
				
				var shift = 0;
				// Calc shift
				for (var i =0;i<index;i++) {
					shift+=that.scope.slides[i].width;
				}

				if (that.options.css3)
				shift-=that.scope.transShift;
				else 
				shift-=that.scope.transShift;

				that.scope.currentSlide = $(that.nodes.train).find('>*:eq('+index+')');

				$(that.nodes.train).find('>*').removeClass("current");
				$(that.scope.currentSlide).addClass("current");
				
				
				that.scope.currentShift = shift;

				that.trigger('select', [index]); // Call event `select` when slides changes
				that._move(callback, instantly);
			}

			// Check for `need reinit` options
			if (this.scope.requireReInit) {
				this.recalc(function() {
					calcs();
				});
			} else {
				calcs();
			}

			
			return this;	
		}
		this.modules = {
			/* Main module */
			'main': function() {
				var that = this;
				// User initial (execute user function in slider context before initialization)
				if ("function"==typeof this.options.init) this.options.init.call(this);

				// Initial nodes
				this.nodes.reels = $(this.nodes.slider).find('>*:first-child');			
				this.nodes.train = $(this.nodes.reels).find('>*:first-child');

				// Set default slide
				this.scope.currentSlide = $(this.nodes.train).find('>*:first-child');
				// Set default slide index
				this.scope.currentSlideIndex = 0;

				// Set class to slider
				$(this.nodes.slider).addClass("jquery-reels");

				// Test fot css3 support
				(this.options.css3=="auto") && (this.options.css3 = (function(d) {
					
					if (typeof d.style['transition'] == "string") return true;
					else return false;
				})(document.body || document.documentElement));

				// Convert duration to ms
				if ("number"!==typeof this.options.duration) {
					if ("string"===typeof this.options.duration) {
						if (this.options.duration.toLowerCase().substr(-2)=='ms') {
							this.options.duration = parseFloat(this.options.duration.substr(0,-2));
						} else if (this.options.duration.toLowerCase().substr(-1)=='s') {
							try {
								this.options.duration = parseFloat(this.options.duration.substr(0,-1))*1000;
							} catch(e) {
								this.options.duration = 650;
							}
						} else {
							this.options.duration = 650;
						}
					}
				}
				
				// Get triggers
				/* Определеяем триггеры, на которые вешаются действия в зависимости от их аттрибутов */
				var disambleToArray;
				disambleToArray = function(trig) {
					var triggers = [];
					switch(typeof trig) {
						case "string":
							triggers.push($(trig));
						break;
						case "object":
							if (trig instanceof Array) {
								for (var i =0;i<trig.length;i++) {
									var result = disambleToArray(trig[i]);
									for (var q =0;q<result.length;q++) {
										triggers.push(result[q]);
									}
								}
							} else {
								triggers.push($(trig))
							}
						break;
						case "function":
							triggers = disambleToArray(trig.call(this));
						break;
					}
					return triggers;
				}
				var triggers = disambleToArray(this.options.triggers);

				for (var i=0;i<triggers.length;i++) {
					if ($(triggers[i]).attr("goto")) {
						$(triggers[i]).click(function() {
							that.gotoElement($(that.nodes.train).find('[name='+$(this).attr("goto")+']'));
							$(this).parent().find('>*').removeClass("current");
							$(this).addClass("current");
							return false;
						});
					};
				}
				// Get frames sizes
				that.recalc();
				// And recalc after loading
				this.init('preloads');

				// Set style
				this.enableAnimation();

				// Autoshow
				if (this.options.autoplay && !this.options.listen) { // Disable automode when we are listners

					this.autoplay();
				};

				// We are listners
				if (this.options.listen) {
					this.options.listen.bind('next', function() {
						that.next();
					});
					this.options.listen.bind('prev', function() {
						that.prev();
					});
				}

				// Listen for events
				$(window).resize(function() {
					that.recalc(function() {
						this.goto();
					});
				});

				$(window).ready(function() {
					that.recalc(function() {
						this.goto();
					});
				});

				// Enable touch
				if (this.options.touch && this.options.css3) {
					this.init('touch');
				}

				
			},
			/* Touch module */
			'touch': function() {
				this.services['touch'] = new (function(parent) {
					this.parent = parent;
					this.state = {
						tryDistance: 0
					};
					this.init = function() {
						var plugin = this;
						// Bind touch events
						Brahma($(this.parent.nodes.reels)).component('touch', {
							preventDefaultEvents: false
						})
						.bind('wipe', function(e) {
							plugin.dragTry(e.dX);
						})
						.bind('throw', function() {
							plugin.throwTry();
						});
					}
					this.dragTry = function(distance) {
						this.state.tryDistance = distance;
						this.parent.disableAnimation();
						this.parent.translateX( (this.parent.scope.currentShift+distance) *-1);
					}
					this.reset = function() {
						this.parent.translateX(this.parent.scope.currentShift*-1);
					}
					this.throwTry = function(distance) {
						this.parent.enableAnimation();
						if (Math.abs(this.state.tryDistance)>(this.parent.scope.slides[this.parent.scope.currentSlideIndex].width)/4) {

							if (this.state.tryDistance>0) {
								
								this.tryNext();
							} else {
								
								this.tryPrev();
							}
						} else {
							this.reset();
						}
						this.state.tryDistance = 0;
					}
					// Try move to next slide
					this.tryNext = function() {
						this.reset();
						if (this.parent.options.infinity || this.parent.scope.currentSlideIndex<(this.parent.scope.slides.length-1)) {
							
							this.parent.userNext();
						} else {
							this.reset();
						}
					}
					// Try move to back slide
					this.tryPrev = function() {

						if (this.parent.options.infinity || this.parent.scope.currentSlideIndex>1) {

							this.parent.userPrev();
						} else {
							this.reset();
						}
					}
					this.init();
				})(this);
			},
			/* Preload all images inside slides*/
			'preloads': function() {
				var that = this;
				$(this.nodes.train).find('img').each(function() {
					var i = new Image();
					i.onload = function() {
						
						that.recalc();
						// Show first frame
						that.goto(0, function(){},true);
					};
					i.src = $(this).attr("src");
				});
			}
		}
		this.init();
	};

	$.fn.reels = $.fn.reels = function(options) {
		var options = options || {};
		return $(this).each(function() {
			new reels(this, options);
		});
	};
})(jQuery);