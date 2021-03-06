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
			effect: 'slide', // Aviable effect
			duration: 650,
			css3: 'auto',
			triggers: false, // jQuery objects, selector or array,
			autoplay: false, // false ot integer value (ms)
			infinity: true, // Infinity photos (repeats for ever). The amount should be between 3!
			init: false, // Execute this function before initial in context
			listen: false, // Listen for another slider and copy its actions
			touch: true, // Enable touch events
			minReloadDelay: 0, // Delay between user events
			shiftX: 0, // constant shift the x-axis (fot half-view preview slide)
			wide: true, // Wideslide 
			slideWidth: false, // Ширина слайда, которая выставляется принудительно
			visibleCount: 1, // Количество слайдов, которое помещается в визуальный ряд (Заменить на рассчет длинны!)
			centered: false // Try to show slide on center of wrapper
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
				if (that.options.slideWidth) $(this).css("width", that.options.slideWidth);
				that.scope.slides.push({
					width: $(this).outerWidth()
				});
			});

			this.trigger('change'); // Call change event after recalc
			
			if (!$(this.nodes.train).is(':visible')) {
				this.scope.requireReInit = true;
			} else {
				this.scope.requireReInit = false;
			};

			// Проверка. Если у нас слайдов менее 4, то мы выставляет паузу между возможными пользовательскими действиями равными половине времени движения слайда
			if (this.scope.slides.length<4) {
				this.options.minReloadDelay = Math.round(this.scope._.duration/2);
			}
			
			// Hide controls
			if (this.nodes.controlLeft || this.nodes.controlRight) {

				if (this.scope.slides.length<2) {
					$(this.nodes.controlLeft).hide();
					$(this.nodes.controlRight).hide();
				} else {
					$(this.nodes.controlLeft).show();
					$(this.nodes.controlRight).show();
				}
			}

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
				if (this.scope.autoplayer) clearInterval(this.scope.autoplayer);
				this.options.autoplay = false;
			}
			this.prev();
		};
		this.userNext = function() {
			// Невозможность выполнить действие за минимальный блокирующий промежуток времени
			if (this._getSlidePassedTime()<this.options.minReloadDelay) {
				
				return false;
			}
			console.log('this.options.minReloadDelay', this.options.minReloadDelay);

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
					
					that.translateX( (that.scope.currentShift-that.options.shiftX)*-1);
					
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
					$(that.nodes.train).animate({"margin-left": ((that.scope.currentShift-that.options.shiftX)*-1)+'px'}, that.options.duration, function() {
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

				// С учетом опции вместимости слайдов в визуальный ряд, определяем последний слайд в списке
				var highSlide = this.scope.currentSlideIndex+(this.options.visibleCount-1);

				if ($(this.nodes.train).find('>*:eq('+highSlide+')').is(":last-child")) {

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
							"margin-left": ( (that.scope.transShift-that.options.shiftX)*-1)+'px',
							"margin-right": (that.scope.transShift-that.options.shiftX)+'px',
							"-webkit-animation-fill-mode": "forward"
						});

					} else {
						// Mofif that.scope.currentShift
						that.scope.currentShift += that.scope.transShift;
						// Modif reels margin when no css3 mode
						$(that.nodes.train).css({
							"margin-left": ((that.scope.currentShift+that.scope.transShift-that.options.shiftX)*-1)+'px'
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
			this.goto($(element).index());
		};
		this.goto = function(index, callback, instantly) {
			
			var instantly = instantly || false;
			var callback = callback || false;
			var index = "undefined"!=typeof index ? index : this.scope.currentSlideIndex;
			var that = this;
			
			var nowIndex = that.scope.currentSlideIndex;
			that.scope.currentSlideIndex = index;

			// Calc realtime
			this.scope.startTime = new Date().getTime();

			if (!this.options.css3 && this.scope.animated) return false; 


			var calcs = function() {
				// Get element index
				
				var shift = 0;
				// Calc shift
				for (var i =0;i<index;i++) {
					shift+=that.scope.slides[i].width;
				}
				if (that.options.centered) {
					// This option will enable centered position of slide
					// Нам необходимо взять ширину слайда и ширину контенера
					var sliderWidth = $(that.nodes.slider).outerWidth();
					var slideWidth = that.scope.slides[i].width;
					that.options.shiftX = Math.round((sliderWidth-slideWidth)/2);
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
		/*
			Форсированное указание на то, что в конце списка появился ещё один слайд.
			Провоцирует лишь пересчет слайдов
		*/
		this.forceAppended = function() {
			var that = this;
			this.recalc();
			this.preloadSlides([$(this.nodes.train).find('>*:last-child')], function() {
				that.recalc();

				that.goto();
			});
		};
		/*
			Форсирование указание на то, что вначале списка появился ещё один слайд.
			Провоцирует моментальный сдвиг на ширину нового слайда.
		*/
		this.forcePrepended = function() {
			var that = this;
			var fit = function(slides) {
				var fch = slides[0];
				that.scope.currentSlideIndex++;
				that.scope.transShift = that.scope.transShift+$(fch).outerWidth();
					
				if (that.options.css3) {
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
				that.goto();
			};
			fit();
			this.preloadSlides([$(that.nodes.train).find('>*:first-child')], fit);
		};
		/* Ждет когда слайд будет полностью загружен, затем выполняет callback */
		this.preloadSlides = function(slides, callback) {
			var that = this;
			var loadings = 0;
			var images = [];
			var callback = callback || function() {};
			if (!(slides instanceof Array)) slides = [slides];
			var check = function() {
				if (loadings<=0) callback(that);
			}
			$.each(slides, function() {
				$(this).find('img').each(function() {
					
					images.push($(this).attr("src"));
					loadings++;
					
				});
			});
			if (images.length>0) {
				for(var i =0;i<images.length;i++) {
					(function(url) {
						var test = new Image();
						test.onload = test.onerror = function() {
							loadings--;
							check();	
						}
						test.src = url;
					})(images[i]);
				}
			} else {
				callback.call(this);
			}
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

				// Initial temp duration
				this.scope._.duration = this.options.duration;

				// Sey chock-a-block
				if (this.options.wide) {
					
					$(this.nodes.train).addClass("wide");

				}

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

				// Enable controls if slides more than
				if (this.options.controls) {
					this.init('controls');
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
							minMoveX: 1,
							minMoveY: 999,
							freeClick: true,
							preventDefaultEvents: true
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
						this.parent.translateX( (this.parent.scope.currentShift+distance-this.parent.options.shiftX) *-1);
					}
					this.reset = function() {
						this.parent.translateX((this.parent.scope.currentShift-this.parent.options.shiftX)*-1);
					}
					this.throwTry = function(distance) {
						this.parent.enableAnimation();
						if (Math.abs(this.state.tryDistance)>(this.parent.scope.slides[this.parent.scope.currentSlideIndex].width)/4) {
							this.parent.scope.currentShift=this.parent.scope.currentShift+this.state.tryDistance;
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
						that.goto(that.scope.currentSlideIndex, function(){},true);
					};
					i.src = $(this).attr("src");
				});
			},
			/* Controls */
			'controls': function() {
				var that = this;
				// Controls options
				var options = "object" == typeof this.options.controls ? this.options.controls : {};

				// Initial left and right options
				var leftOptions = {
					shadow: true,
					style: false,
					"class": false
				};
				var rightOptions = {
					shadow: true,
					style: false,
					"class": false
				};

				// Get options for left and right, or inherit from general options
				if ("object"===typeof options.left) {
					leftOptions = $.extend(leftOptions, options.left);
				} else {
					leftOptions = $.extend(leftOptions, options);
				}

				if ("object"===typeof options.right) {
					rightOptions = $.extend(rightOptions, options.right);
				} else {
					rightOptions = $.extend(rightOptions, options);
				}

				$(this.nodes.slider)
					.css("position", "relative");

				// Add controls left
				(function(options) {console.log('options', options);
					if ("string"!==typeof options["class"]) {
						// Get shadow option
						var background = !options.shadow ? 'transparent' : 'rgba(0,0,0,0.2)';

						var style = {
							"position": "absolute",
							"cursor": "pointer",
							"left": "0px",
							"top": "0%",
							"height": "100%",
							"width": "30px",
							"background": "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAaCAYAAACHD21cAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkExOTY3MkNFODlGNjExRTQ5NTExRjg4RjlGMTU1Q0ZDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkExOTY3MkNGODlGNjExRTQ5NTExRjg4RjlGMTU1Q0ZDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QTE5NjcyQ0M4OUY2MTFFNDk1MTFGODhGOUYxNTVDRkMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QTE5NjcyQ0Q4OUY2MTFFNDk1MTFGODhGOUYxNTVDRkMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4qrjKQAAAAuUlEQVR42pzUUQrCMAwG4M6Jd9VbbCiCMBgIA58Gg8FAEG/gu+CZaqspBF3X/28gG3v4BmmTFNZaQ0bn8mU8JPJsv9EzqBU0uCyz0Kc8ADWCxoAQGNCkUQqeYmgJHgVd51AMJtEc3Cu0Wapff1Qo0rAWdENQgA9BdxT5XLmGLU1OyB8OTH2/hwNdQ+w6YEy3WqrlmhSmxwkdq78BRmEU00uKWR0hO4XNmmiynby3/lFkLOSLy+dbgAEA9T/S6ppLJVUAAAAASUVORK5CYII=') center center no-repeat "+background
						};

						// Import custome style
						if ("object"===typeof options.style) style = $.extend(style,options.style);
					} else {
						var style = {};
					}

					$(this.nodes.slider)
					.put($('<div />', {
						"class":"controls-left"
					}))
					.css(style)
					.condition("string"===typeof options["class"], function() {
						$(this).addClass(options["class"]);
						return this;
					}, function() { return this; })
					.bind('click', function() {

						that.userPrev();
						return false;
					})
					.tie(function() {
						that.nodes.controlLeft = this;
					})
					.put($('<div />'));
				}).call(this, leftOptions);

				// Add controls right
				(function(options) {

					if ("string"!==typeof options["class"]) {
						// Get shadow option
						var background = !options.shadow ? 'transparent' : 'rgba(0,0,0,0.2)';

						var style = {
							"position": "absolute",
							"cursor": "pointer",
							"right": "0px",
							"top": "0%",
							"height": "100%",
							"width": "30px",
							"background": "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAaCAYAAACHD21cAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkExOTY3MkQyODlGNjExRTQ5NTExRjg4RjlGMTU1Q0ZDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkExOTY3MkQzODlGNjExRTQ5NTExRjg4RjlGMTU1Q0ZDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QTE5NjcyRDA4OUY2MTFFNDk1MTFGODhGOUYxNTVDRkMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QTE5NjcyRDE4OUY2MTFFNDk1MTFGODhGOUYxNTVDRkMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7C/KBAAAAAtElEQVR42mL4//9/MhBPA2IGUjCImPMfAiaTqpEZiBdBNU8gRSNZmpE5IM1LoZp7SdEI07yCGM3YBJE1d5GiEaZ5NVRzOykaCWomFHpsSJpbSNEI07wOqrmRFI3omptI0QjTvBmqeT8TA2ngL5RmJsU2WCC1EutUrNFCliZiEgDOpEeMpl5SEjnB7IVNE1EZmixN6EXHfFIKLRhjPqklHbImkspWFmC6OwLE34E4i5RECxBgAG2AI1+KAqwGAAAAAElFTkSuQmCC') center center no-repeat "+background
						};

						// Import custome style
						if ("object"===typeof options.style) style = $.extend(style,options.style);
					} else {
						var style = {};
					}

					$(this.nodes.slider)
					.put($('<div />', {
						"class":"controls-right"
					}))
					.css(style)
					.condition("string"===typeof options["class"], function() {
						$(this).addClass(options["class"]);
						return this;
					}, function() { return this; })
					.bind('click', function() {

						that.userNext();
						return false;
					})
					.tie(function() {
						that.nodes.controlRight = this;
					})
					.put($('<div />'));
				}).call(this, rightOptions);
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