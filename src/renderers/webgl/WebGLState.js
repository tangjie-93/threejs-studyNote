import { NotEqualDepth, GreaterDepth, GreaterEqualDepth, EqualDepth, LessEqualDepth, LessDepth, AlwaysDepth, NeverDepth, CullFaceFront, CullFaceBack, CullFaceNone, DoubleSide, BackSide, CustomBlending, MultiplyBlending, SubtractiveBlending, AdditiveBlending, NoBlending, NormalBlending, AddEquation, SubtractEquation, ReverseSubtractEquation, MinEquation, MaxEquation, ZeroFactor, OneFactor, SrcColorFactor, SrcAlphaFactor, SrcAlphaSaturateFactor, DstColorFactor, DstAlphaFactor, OneMinusSrcColorFactor, OneMinusSrcAlphaFactor, OneMinusDstColorFactor, OneMinusDstAlphaFactor, ConstantColorFactor, OneMinusConstantColorFactor, ConstantAlphaFactor, OneMinusConstantAlphaFactor } from '../../constants.js';
import { Color } from '../../math/Color.js';
import { Vector4 } from '../../math/Vector4.js';

function WebGLState(gl) {

	/**
	 * ColorBuffer类用于管理WebGL中的颜色缓冲区设置，包括颜色掩码、清除颜色以及锁定状态。
	 * @returns {Object} 返回一个包含颜色缓冲区操作方法的对象。
	 */
	function ColorBuffer() {
		let locked = false; // 锁定状态，防止在渲染过程中修改颜色缓冲区设置
		const color = new Vector4(); // 用于存储当前设置的颜色值
		let currentColorMask = null; // 当前设置的颜色掩码
		const currentColorClear = new Vector4(0, 0, 0, 0); // 当前设置的清除颜色
		return {
			/**
			 * 设置颜色掩码。
			 * @param {boolean} colorMask - 一个布尔值，用于控制RGBA四个通道是否写入颜色缓冲区。
			 */
			setMask: function (colorMask) {
				if (currentColorMask !== colorMask && !locked) {
					gl.colorMask(colorMask, colorMask, colorMask, colorMask);
					currentColorMask = colorMask;
				}
			},
			setLocked: function (lock) {
				locked = lock;
			},
			// 设置颜色缓冲区清除值
			setClear: function (r, g, b, a, premultipliedAlpha) {
				if (premultipliedAlpha === true) {
					r *= a; g *= a; b *= a;
				}
				color.set(r, g, b, a);
				if (currentColorClear.equals(color) === false) {
					gl.clearColor(r, g, b, a);
					currentColorClear.copy(color);
				}
			},
			// 重置数据
			reset: function () {
				locked = false;
				currentColorMask = null;
				currentColorClear.set(- 1, 0, 0, 0); // set to invalid state
			}
		};
	}

	/**
	 * 深度缓冲区管理类
	 * 用于管理和配置WebGL的深度测试、深度掩码、深度函数和深度清除值。
	 * @returns {Object} 返回一个包含深度缓冲区管理方法的对象
	 */
	function DepthBuffer() {

		// 定义一个标志，用于控制深度缓冲区设置是否锁定
		let locked = false;

		// 用于存储当前的深度测试掩码
		let currentDepthMask = null;
		// 用于存储当前的深度比较函数
		let currentDepthFunc = null;
		// 用于存储当前的深度清除值
		let currentDepthClear = null;

		return {

			// 设置是否启用深度测试
			setTest: function (depthTest) {

				if (depthTest) {

					// 如果启用深度测试
					enable(gl.DEPTH_TEST);

				} else {

					// 如果禁用深度测试
					disable(gl.DEPTH_TEST);

				}

			},

			// 设置深度缓冲区掩码
			setMask: function (depthMask) {

				// 如果当前掩码与传入的不同且深度缓冲区未锁定，则更新掩码
				if (currentDepthMask !== depthMask && !locked) {
					// 设置深度缓冲区的写入启用标志
					gl.depthMask(depthMask); // 设置 WebGL 深度缓冲区掩码
					currentDepthMask = depthMask; // 更新当前掩码

				}

			},

			// 设置深度比较函数
			// 用于比较每个传入像素深度值与深度缓冲区中深度值的函数
			setFunc: function (depthFunc) {

				// 如果当前比较函数与传入的不同，则根据传入的比较函数更新 WebGL 的深度比较设置
				if (currentDepthFunc !== depthFunc) {

					switch (depthFunc) {

						case NeverDepth: // 假设 NeverDepth 是某种预定义的表示“从不”的比较方式

							gl.depthFunc(gl.NEVER);
							break;

						case AlwaysDepth: // 假设 AlwaysDepth 是某种预定义的表示“总是”的比较方式

							gl.depthFunc(gl.ALWAYS);
							break;

						// 其他比较方式类似，这里省略了具体的枚举值比较和设置

						default:

							gl.depthFunc(gl.LEQUAL); // 默认使用“小于等于”的比较方式

					}

					currentDepthFunc = depthFunc; // 更新当前比较函数

				}

			},

			// 设置深度缓冲区是否锁定
			setLocked: function (lock) {

				locked = lock; // 更新锁定状态

			},

			// 设置深度清除值
			setClear: function (depth) {

				// 如果当前清除值与传入的不同，则更新 WebGL 的深度清除值
				if (currentDepthClear !== depth) {

					gl.clearDepth(depth); // 设置 WebGL 深度清除值
					currentDepthClear = depth; // 更新当前清除值

				}

			},

			// 重置深度缓冲区设置
			reset: function () {

				locked = false; // 取消锁定

				currentDepthMask = null; // 重置掩码
				currentDepthFunc = null; // 重置比较函数
				currentDepthClear = null; // 重置清除值

			}

		};

	}

	/**
	 * StencilBuffer 类，用于管理 WebGL 中的模板缓冲区设置
	 */
	function StencilBuffer() {

		let locked = false;

		let currentStencilMask = null;
		let currentStencilFunc = null;
		let currentStencilRef = null;
		let currentStencilFuncMask = null;
		let currentStencilFail = null;
		let currentStencilZFail = null;
		let currentStencilZPass = null;
		let currentStencilClear = null;

		return {
			// 设置模板缓冲区是否启用
			setTest: function (stencilTest) {

				if (!locked) {

					if (stencilTest) {

						enable(gl.STENCIL_TEST);

					} else {

						disable(gl.STENCIL_TEST);

					}

				}

			},

			setMask: function (stencilMask) {

				if (currentStencilMask !== stencilMask && !locked) {

					gl.stencilMask(stencilMask);
					currentStencilMask = stencilMask;

				}

			},
			// 设置模板测试的函数
			// 设置模板测试函数、引用值和掩码
			setFunc: function (stencilFunc, stencilRef, stencilMask) {

				if (currentStencilFunc !== stencilFunc ||
					currentStencilRef !== stencilRef ||
					currentStencilFuncMask !== stencilMask) {

					gl.stencilFunc(stencilFunc, stencilRef, stencilMask);

					currentStencilFunc = stencilFunc;
					currentStencilRef = stencilRef;
					currentStencilFuncMask = stencilMask;

				}

			},
			//  配置模板测试失败、深度测试失败和深度测试通过时的操作
			setOp: function (stencilFail, stencilZFail, stencilZPass) {

				if (currentStencilFail !== stencilFail ||
					currentStencilZFail !== stencilZFail ||
					currentStencilZPass !== stencilZPass) {

					gl.stencilOp(stencilFail, stencilZFail, stencilZPass);

					currentStencilFail = stencilFail;
					currentStencilZFail = stencilZFail;
					currentStencilZPass = stencilZPass;

				}

			},

			setLocked: function (lock) {

				locked = lock;

			},

			setClear: function (stencil) {

				if (currentStencilClear !== stencil) {

					gl.clearStencil(stencil);
					currentStencilClear = stencil;

				}

			},

			reset: function () {

				locked = false;

				currentStencilMask = null;
				currentStencilFunc = null;
				currentStencilRef = null;
				currentStencilFuncMask = null;
				currentStencilFail = null;
				currentStencilZFail = null;
				currentStencilZPass = null;
				currentStencilClear = null;

			}

		};

	}

	// 缓冲区实例化
	const colorBuffer = new ColorBuffer();
	const depthBuffer = new DepthBuffer();
	const stencilBuffer = new StencilBuffer();

	const uboBindings = new WeakMap();
	const uboProgramMap = new WeakMap();

	let enabledCapabilities = {};

	let currentBoundFramebuffers = {};
	let currentDrawbuffers = new WeakMap();
	let defaultDrawbuffers = [];

	let currentProgram = null;

	let currentBlendingEnabled = false;
	let currentBlending = null;
	let currentBlendEquation = null;
	let currentBlendSrc = null;
	let currentBlendDst = null;
	let currentBlendEquationAlpha = null;
	let currentBlendSrcAlpha = null;
	let currentBlendDstAlpha = null;
	let currentBlendColor = new Color(0, 0, 0);
	let currentBlendAlpha = 0;
	let currentPremultipledAlpha = false;

	let currentFlipSided = null;
	let currentCullFace = null;

	let currentLineWidth = null;

	let currentPolygonOffsetFactor = null;
	let currentPolygonOffsetUnits = null;

	const maxTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

	let lineWidthAvailable = false;
	let version = 0;
	const glVersion = gl.getParameter(gl.VERSION);

	if (glVersion.indexOf('WebGL') !== - 1) {

		version = parseFloat(/^WebGL (\d)/.exec(glVersion)[1]);
		lineWidthAvailable = (version >= 1.0);

	} else if (glVersion.indexOf('OpenGL ES') !== - 1) {

		version = parseFloat(/^OpenGL ES (\d)/.exec(glVersion)[1]);
		lineWidthAvailable = (version >= 2.0);

	}

	let currentTextureSlot = null;
	let currentBoundTextures = {};

	const scissorParam = gl.getParameter(gl.SCISSOR_BOX);
	const viewportParam = gl.getParameter(gl.VIEWPORT);

	const currentScissor = new Vector4().fromArray(scissorParam);
	const currentViewport = new Vector4().fromArray(viewportParam);

	/**
	 * 创建一个纹理
	 *
	 * @param type 纹理类型
	 * @param target 目标纹理类型
	 * @param count 纹理数量
	 * @param dimensions 纹理维度
	 * @returns 返回创建的纹理
	 */
	function createTexture(type, target, count, dimensions) {
		const data = new Uint8Array(4); // 4 is required to match default unpack alignment of 4.
		const texture = gl.createTexture();
		gl.bindTexture(type, texture);
		gl.texParameteri(type, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(type, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		for (let i = 0; i < count; i++) {
			if (type === gl.TEXTURE_3D || type === gl.TEXTURE_2D_ARRAY) {
				gl.texImage3D(target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
			} else {
				gl.texImage2D(target + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
			}
		}
		return texture;
	}

	const emptyTextures = {};
	emptyTextures[gl.TEXTURE_2D] = createTexture(gl.TEXTURE_2D, gl.TEXTURE_2D, 1);
	emptyTextures[gl.TEXTURE_CUBE_MAP] = createTexture(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 6);
	emptyTextures[gl.TEXTURE_2D_ARRAY] = createTexture(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_2D_ARRAY, 1, 1);
	emptyTextures[gl.TEXTURE_3D] = createTexture(gl.TEXTURE_3D, gl.TEXTURE_3D, 1, 1);

	// init
	// 初始化缓冲区状态
	colorBuffer.setClear(0, 0, 0, 1);
	depthBuffer.setClear(1);
	stencilBuffer.setClear(0);
	// 开启深度缓冲
	enable(gl.DEPTH_TEST);
	depthBuffer.setFunc(LessEqualDepth);

	setFlipSided(false);
	setCullFace(CullFaceBack);
	enable(gl.CULL_FACE);

	setBlending(NoBlending);

	/**
	 * 启用指定的WebGL功能
	 * 
	 * @param {number} id 要启用的WebGL功能的枚举值，如gl.DEPTH_TEST等
	 * @description 如果指定的WebGL功能尚未启用，则启用它，并在enabledCapabilities对象中记录其状态为true。
	 *              enabledCapabilities对象用于跟踪哪些WebGL功能已被启用。
	 */
	function enable(id) {

		if (enabledCapabilities[id] !== true) {

			gl.enable(id);
			enabledCapabilities[id] = true;

		}

	}

	/**
	 * 禁用指定的 WebGL 功能。
	 * 
	 * @param {number} id - 要禁用的 WebGL 功能的枚举标识符。
	 * @description 此函数首先检查给定功能的当前启用状态。如果该功能当前已启用（即，enabledCapabilities[id] 不是 false），
	 * 则会调用 gl.disable(id) 来禁用它，并将 enabledCapabilities[id] 设置为 false，以记录该功能已被禁用。
	 * 如果功能已经禁用，则不会执行任何操作。
	 */
	function disable(id) {

		if (enabledCapabilities[id] !== false) {

			gl.disable(id);
			enabledCapabilities[id] = false;

		}

	}

	/**
	 * 绑定帧缓冲区到WebGL上下文。
	 * 如果当前绑定的帧缓冲区与传入的帧缓冲区不同，则进行绑定，并更新当前绑定的帧缓冲区记录。
	 * 对于gl.DRAW_FRAMEBUFFER和gl.FRAMEBUFFER，它们被视为等效的，并相互更新。
	 *
	 * @param {number} target - 绑定点，例如gl.DRAW_FRAMEBUFFER或gl.READ_FRAMEBUFFER。
	 * @param {WebGLFramebuffer} framebuffer - 要绑定的帧缓冲区对象。
	 * @returns {boolean} 如果成功绑定了新的帧缓冲区，则返回true；如果已绑定相同的帧缓冲区，则返回false。
	 */
	function bindFramebuffer(target, framebuffer) {

		if (currentBoundFramebuffers[target] !== framebuffer) {

			gl.bindFramebuffer(target, framebuffer);

			currentBoundFramebuffers[target] = framebuffer;

			// gl.DRAW_FRAMEBUFFER is equivalent to gl.FRAMEBUFFER

			if (target === gl.DRAW_FRAMEBUFFER) {

				currentBoundFramebuffers[gl.FRAMEBUFFER] = framebuffer;

			}

			if (target === gl.FRAMEBUFFER) {

				currentBoundFramebuffers[gl.DRAW_FRAMEBUFFER] = framebuffer;

			}

			return true;

		}

		return false;

	}

	/**
	 * 根据渲染目标和帧缓冲区配置绘制缓冲区。
	 *
	 * @param {Object} renderTarget - 渲染目标对象，包含纹理数组。
	 * @param {WebGLFramebuffer} framebuffer - WebGL帧缓冲区对象。
	 *
	 * 此函数会根据提供的渲染目标和帧缓冲区来设置WebGL的绘制缓冲区。
	 * 如果提供了renderTarget，它会根据renderTarget中的纹理数量来配置绘制缓冲区，
	 * 确保每个纹理都对应一个绘制缓冲区。
	 * 如果未提供renderTarget，则默认使用屏幕缓冲区（gl.BACK）。
	 * 如果配置发生变化，会调用gl.drawBuffers来更新WebGL的绘制缓冲区设置。
	 */
	function drawBuffers(renderTarget, framebuffer) {

		// 默认绘制缓冲区
		let drawBuffers = defaultDrawbuffers;

		// 是否需要更新绘制缓冲区
		let needsUpdate = false;

		if (renderTarget) {

			// 获取当前帧缓冲对应的绘制缓冲区
			drawBuffers = currentDrawbuffers.get(framebuffer);

			if (drawBuffers === undefined) {

				// 初始化绘制缓冲区数组
				drawBuffers = [];
				// 设置当前帧缓冲对应的绘制缓冲区
				currentDrawbuffers.set(framebuffer, drawBuffers);

			}

			// 获取渲染目标的纹理数组
			const textures = renderTarget.textures;

			// 如果绘制缓冲区长度与纹理数组长度不一致，或者绘制缓冲区的第一个元素不是gl.COLOR_ATTACHMENT0
			if (drawBuffers.length !== textures.length || drawBuffers[0] !== gl.COLOR_ATTACHMENT0) {

				// 遍历纹理数组，设置绘制缓冲区
				for (let i = 0, il = textures.length; i < il; i++) {

					drawBuffers[i] = gl.COLOR_ATTACHMENT0 + i;

				}

				// 设置绘制缓冲区长度为纹理数组长度
				drawBuffers.length = textures.length;

				// 标记需要更新绘制缓冲区
				needsUpdate = true;

			}

		} else {

			// 如果绘制缓冲区的第一个元素不是gl.BACK
			if (drawBuffers[0] !== gl.BACK) {

				// 设置绘制缓冲区的第一个元素为gl.BACK
				drawBuffers[0] = gl.BACK;

				// 标记需要更新绘制缓冲区
				needsUpdate = true;

			}

		}

		// 如果需要更新绘制缓冲区
		if (needsUpdate) {

			// 更新绘制缓冲区
			gl.drawBuffers(drawBuffers);

		}

	}

	/**
	 * 使用指定的着色器程序
	 * 
	 * @param {WebGLProgram} program - 要使用的WebGL着色器程序
	 * @returns {boolean} 如果成功切换了着色器程序，则返回true；否则返回false
	 * 
	 * 这个函数会检查传入的着色器程序是否与当前正在使用的程序不同。
	 * 如果不同，它会调用WebGL的gl.useProgram方法来切换着色器程序，
	 * 并更新当前程序的状态。如果成功切换了程序，则返回true；
	 * 如果程序已经是当前程序，则不会进行任何操作，并返回false。
	 */
	function useProgram(program) {

		if (currentProgram !== program) {

			gl.useProgram(program);

			currentProgram = program;

			return true;

		}

		return false;

	}

	const equationToGL = {
		[AddEquation]: gl.FUNC_ADD,
		[SubtractEquation]: gl.FUNC_SUBTRACT,
		[ReverseSubtractEquation]: gl.FUNC_REVERSE_SUBTRACT
	};

	equationToGL[MinEquation] = gl.MIN;
	equationToGL[MaxEquation] = gl.MAX;

	const factorToGL = {
		[ZeroFactor]: gl.ZERO,
		[OneFactor]: gl.ONE,
		[SrcColorFactor]: gl.SRC_COLOR,
		[SrcAlphaFactor]: gl.SRC_ALPHA,
		[SrcAlphaSaturateFactor]: gl.SRC_ALPHA_SATURATE,
		[DstColorFactor]: gl.DST_COLOR,
		[DstAlphaFactor]: gl.DST_ALPHA,
		[OneMinusSrcColorFactor]: gl.ONE_MINUS_SRC_COLOR,
		[OneMinusSrcAlphaFactor]: gl.ONE_MINUS_SRC_ALPHA,
		[OneMinusDstColorFactor]: gl.ONE_MINUS_DST_COLOR,
		[OneMinusDstAlphaFactor]: gl.ONE_MINUS_DST_ALPHA,
		[ConstantColorFactor]: gl.CONSTANT_COLOR,
		[OneMinusConstantColorFactor]: gl.ONE_MINUS_CONSTANT_COLOR,
		[ConstantAlphaFactor]: gl.CONSTANT_ALPHA,
		[OneMinusConstantAlphaFactor]: gl.ONE_MINUS_CONSTANT_ALPHA
	};

	/**
	 * 设置混合模式
	 *
	 * @param blending 混合模式
	 * @param blendEquation 混合方程
	 * @param blendSrc 混合源因子
	 * @param blendDst 混合目标因子
	 * @param blendEquationAlpha 混合方程Alpha
	 * @param blendSrcAlpha 混合源因子Alpha
	 * @param blendDstAlpha 混合目标因子Alpha
	 * @param blendColor 混合颜色
	 * @param blendAlpha 混合Alpha值
	 * @param premultipliedAlpha 是否使用预乘Alpha
	 */
	function setBlending(blending, blendEquation, blendSrc, blendDst, blendEquationAlpha, blendSrcAlpha, blendDstAlpha, blendColor, blendAlpha, premultipliedAlpha) {
		if (blending === NoBlending) {
			if (currentBlendingEnabled === true) {
				disable(gl.BLEND);
				currentBlendingEnabled = false;
			}
			return;
		}
		if (currentBlendingEnabled === false) {
			enable(gl.BLEND);
			currentBlendingEnabled = true;
		}
		if (blending !== CustomBlending) {

			if (blending !== currentBlending || premultipliedAlpha !== currentPremultipledAlpha) {

				if (currentBlendEquation !== AddEquation || currentBlendEquationAlpha !== AddEquation) {

					gl.blendEquation(gl.FUNC_ADD);

					currentBlendEquation = AddEquation;
					currentBlendEquationAlpha = AddEquation;

				}

				if (premultipliedAlpha) {

					switch (blending) {

						case NormalBlending:
							gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
							break;

						case AdditiveBlending:
							gl.blendFunc(gl.ONE, gl.ONE);
							break;

						case SubtractiveBlending:
							gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
							break;

						case MultiplyBlending:
							gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.SRC_ALPHA);
							break;

						default:
							console.error('THREE.WebGLState: Invalid blending: ', blending);
							break;

					}

				} else {

					switch (blending) {

						case NormalBlending:
							gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
							break;

						case AdditiveBlending:
							gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
							break;

						case SubtractiveBlending:
							gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
							break;

						case MultiplyBlending:
							gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
							break;

						default:
							console.error('THREE.WebGLState: Invalid blending: ', blending);
							break;

					}

				}

				currentBlendSrc = null;
				currentBlendDst = null;
				currentBlendSrcAlpha = null;
				currentBlendDstAlpha = null;
				currentBlendColor.set(0, 0, 0);
				currentBlendAlpha = 0;

				currentBlending = blending;
				currentPremultipledAlpha = premultipliedAlpha;

			}

			return;

		}
		// custom blending

		blendEquationAlpha = blendEquationAlpha || blendEquation;
		blendSrcAlpha = blendSrcAlpha || blendSrc;
		blendDstAlpha = blendDstAlpha || blendDst;

		if (blendEquation !== currentBlendEquation || blendEquationAlpha !== currentBlendEquationAlpha) {

			gl.blendEquationSeparate(equationToGL[blendEquation], equationToGL[blendEquationAlpha]);

			currentBlendEquation = blendEquation;
			currentBlendEquationAlpha = blendEquationAlpha;

		}

		if (blendSrc !== currentBlendSrc || blendDst !== currentBlendDst || blendSrcAlpha !== currentBlendSrcAlpha || blendDstAlpha !== currentBlendDstAlpha) {

			gl.blendFuncSeparate(factorToGL[blendSrc], factorToGL[blendDst], factorToGL[blendSrcAlpha], factorToGL[blendDstAlpha]);

			currentBlendSrc = blendSrc;
			currentBlendDst = blendDst;
			currentBlendSrcAlpha = blendSrcAlpha;
			currentBlendDstAlpha = blendDstAlpha;

		}

		if (blendColor.equals(currentBlendColor) === false || blendAlpha !== currentBlendAlpha) {

			gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendAlpha);

			currentBlendColor.copy(blendColor);
			currentBlendAlpha = blendAlpha;

		}

		currentBlending = blending;
		currentPremultipledAlpha = false;

	}

	/**
	 * 设置材质
	 *
	 * @param material 材质对象
	 * @param frontFaceCW 是否顺时针为正面
	 */
	function setMaterial(material, frontFaceCW) {

		// 根据材质的双面属性，设置是否开启背面剔除
		material.side === DoubleSide
			? disable(gl.CULL_FACE)
			: enable(gl.CULL_FACE);

		// 判断是否翻转面，取决于材质的单面属性以及frontFaceCW参数
		let flipSided = (material.side === BackSide);
		if (frontFaceCW) flipSided = !flipSided;

		// 设置是否翻转面
		setFlipSided(flipSided);

		// 根据材质的混合属性，设置混合方式
		(material.blending === NormalBlending && material.transparent === false)
			? setBlending(NoBlending)
			: setBlending(material.blending, material.blendEquation, material.blendSrc, material.blendDst, material.blendEquationAlpha, material.blendSrcAlpha, material.blendDstAlpha, material.blendColor, material.blendAlpha, material.premultipliedAlpha);

		// 深度和颜色缓冲区设置
		// 设置深度测试函数
		// 深度和颜色缓冲区设置
		depthBuffer.setFunc(material.depthFunc);
		// 设置是否进行深度测试
		depthBuffer.setTest(material.depthTest);
		// 设置是否写入深度缓冲区
		depthBuffer.setMask(material.depthWrite);
		// 设置是否写入颜色缓冲区
		colorBuffer.setMask(material.colorWrite);

		const stencilWrite = material.stencilWrite;
		// 根据材质的属性，设置是否开启模板测试
		stencilBuffer.setTest(stencilWrite);
		if (stencilWrite) {
			// 设置模板写入的掩码
			stencilBuffer.setMask(material.stencilWriteMask);
			// 设置模板测试函数、参考值和掩码
			stencilBuffer.setFunc(material.stencilFunc, material.stencilRef, material.stencilFuncMask);
			// 设置模板测试失败、深度测试失败和深度测试通过时的操作
			stencilBuffer.setOp(material.stencilFail, material.stencilZFail, material.stencilZPass);
		}
		// 设置多边形偏移
		// 设置多边形偏移参数
		setPolygonOffset(material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits);
		// gl 根据.材质的alphaToCoverage是否开启多重采样抗
		material.alphaToCoverage === true
			? enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
			: disable(gl.SAMPLE_ALPHA_TO_COVERAGE);

	}

	/**
	 * 设置翻转面
	 *
	 * @param flipSided 是否翻转面，true表示翻转，false表示不翻转
	 * @returns 无返回值
	 */
	function setFlipSided(flipSided) {
		// 判断传入的 flipSided 是否与当前的 currentFlipSided 不相等
		if (currentFlipSided !== flipSided) {
			// 如果 flipSided 为真
			if (flipSided) {
				// 设置正面为顺时针方向
				gl.frontFace(gl.CW);
			} else {
				// 设置正面为逆时针方向
				gl.frontFace(gl.CCW);
			}
			// 更新 currentFlipSided 的值为 flipSided
			currentFlipSided = flipSided;
		}
	}

	/**
	 * 设置剔除面
	 *
	 * @param cullFace 剔除面，可选值为 CullFaceNone、CullFaceBack、CullFaceFront 或 CullFaceFrontAndBack
	 */
	function setCullFace(cullFace) {
		// 如果 cullFace 不等于 CullFaceNone
		if (cullFace !== CullFaceNone) {
			// 启用剔除功能
			enable(gl.CULL_FACE);
			// 如果 cullFace 不等于当前剔除面
			if (cullFace !== currentCullFace) {
				// 如果 cullFace 等于 CullFaceBack
				if (cullFace === CullFaceBack) {
					// 设置剔除背面
					gl.cullFace(gl.BACK);
				// 否则如果 cullFace 等于 CullFaceFront
				} else if (cullFace === CullFaceFront) {
					// 设置剔除正面
					gl.cullFace(gl.FRONT);
				// 否则
				} else {
					// 设置剔除正面和背面
					gl.cullFace(gl.FRONT_AND_BACK);
				}
			}
		// 否则
		} else {
			// 禁用剔除功能
			disable(gl.CULL_FACE);
		}
		// 更新当前剔除面为 cullFace
		currentCullFace = cullFace;
	}

	/**
	 * 设置线宽
	 *
	 * @param width 线宽值
	 * @returns 无返回值
	 */
	function setLineWidth(width) {

		if (width !== currentLineWidth) {

			if (lineWidthAvailable) gl.lineWidth(width);

			currentLineWidth = width;

		}

	}

	/**
	 * 设置多边形偏移量
	 *
	 * @param polygonOffset 是否开启多边形偏移量
	 * @param factor 偏移因子
	 * @param units 偏移单位
	 */
	function setPolygonOffset(polygonOffset, factor, units) {
		if (polygonOffset) {
			enable(gl.POLYGON_OFFSET_FILL);
			if (currentPolygonOffsetFactor !== factor || currentPolygonOffsetUnits !== units) {
				gl.polygonOffset(factor, units);
				currentPolygonOffsetFactor = factor;
				currentPolygonOffsetUnits = units;
			}
		} else {
			disable(gl.POLYGON_OFFSET_FILL);
		}
	}

	/**
	 * 设置剪裁测试
	 *
	 * @param scissorTest 是否开启剪裁测试
	 * @returns 无返回值
	 */
	function setScissorTest(scissorTest) {

		if (scissorTest) {

			enable(gl.SCISSOR_TEST);

		} else {

			disable(gl.SCISSOR_TEST);
		}
	}
	/**
	 * 激活纹理
	 *
	 * @param webglSlot WebGL纹理槽位，可选参数，默认为gl.TEXTURE0 + maxTextures - 1
	 * @returns 无返回值
	 */
	function activeTexture(webglSlot) {

		if (webglSlot === undefined) webglSlot = gl.TEXTURE0 + maxTextures - 1;

		if (currentTextureSlot !== webglSlot) {

			gl.activeTexture(webglSlot);
			currentTextureSlot = webglSlot;

		}

	}

	/**
	 * 绑定纹理
	 *
	 * @param webglType WebGL纹理类型
	 * @param webglTexture WebGL纹理对象
	 * @param webglSlot WebGL纹理槽位，若未指定则使用当前纹理槽位
	 */
	function bindTexture(webglType, webglTexture, webglSlot) {

		if (webglSlot === undefined) {

			if (currentTextureSlot === null) {

				webglSlot = gl.TEXTURE0 + maxTextures - 1;

			} else {

				webglSlot = currentTextureSlot;

			}

		}

		let boundTexture = currentBoundTextures[webglSlot];

		if (boundTexture === undefined) {

			boundTexture = { type: undefined, texture: undefined };
			currentBoundTextures[webglSlot] = boundTexture;

		}

		if (boundTexture.type !== webglType || boundTexture.texture !== webglTexture) {

			if (currentTextureSlot !== webglSlot) {

				gl.activeTexture(webglSlot);
				currentTextureSlot = webglSlot;

			}

			gl.bindTexture(webglType, webglTexture || emptyTextures[webglType]);

			boundTexture.type = webglType;
			boundTexture.texture = webglTexture;

		}

	}

	/**
	 * 取消绑定纹理
	 *
	 * @returns 无
	 */
	function unbindTexture() {

		const boundTexture = currentBoundTextures[currentTextureSlot];

		if (boundTexture !== undefined && boundTexture.type !== undefined) {

			gl.bindTexture(boundTexture.type, null);

			boundTexture.type = undefined;
			boundTexture.texture = undefined;

		}

	}

	/**
	 * 压缩二维纹理图像
	 *
	 * @returns 无返回值
	 */
	function compressedTexImage2D() {

		try {

			gl.compressedTexImage2D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 压缩3D纹理图像
	 *
	 * @description 使用WebGL的compressedTexImage3D方法压缩3D纹理图像
	 * @remarks 当使用compressedTexImage3D方法压缩3D纹理图像时，如果发生错误，会在控制台输出错误信息
	 * @example
	 * compressedTexImage3D(target, level, internalformat, width, height, depth, border, data);
	 * @param target 纹理的目标
	 * @param level 纹理的详细级别
	 * @param internalformat 纹理的格式
	 * @param width 纹理的宽度
	 * @param height 纹理的高度
	 * @param depth 纹理的深度
	 * @param border 纹理的边框
	 * @param data 纹理的数据
	 */
	function compressedTexImage3D() {

		try {

			gl.compressedTexImage3D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 更新纹理的矩形区域。
	 *
	 * @remarks
	 * 该函数用于在WebGL上下文中更新纹理的指定矩形区域。
	 *
	 * @throws 当调用gl.texSubImage2D发生错误时，将抛出异常。
	 */
	function texSubImage2D() {

		try {

			gl.texSubImage2D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 将像素数据更新到已存在的三维纹理的子区域中
	 *
	 * @remarks
	 * 调用WebGL的texSubImage3D方法，将像素数据更新到已存在的三维纹理的子区域中。
	 * 如果调用失败，则在控制台输出错误信息。
	 *
	 * @throws 当调用WebGL的texSubImage3D方法失败时，抛出异常。
	 */
	function texSubImage3D() {

		try {

			gl.texSubImage3D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 使用已压缩的数据更新指定纹理子图像区域。
	 *
	 * @returns 无返回值
	 * @throws 如果gl.compressedTexSubImage2D发生错误，将在控制台中打印错误消息
	 */
	function compressedTexSubImage2D() {

		try {

			gl.compressedTexSubImage2D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 压缩三维纹理子图像
	 *
	 * @returns 无返回值
	 */
	function compressedTexSubImage3D() {

		try {

			gl.compressedTexSubImage3D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 创建二维纹理存储空间
	 *
	 * @returns 无返回值
	 */
	function texStorage2D() {

		try {

			gl.texStorage2D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 创建一个三维纹理存储。
	 *
	 * @remarks
	 * 使用 WebGL 的 texStorage3D 方法创建一个三维纹理存储。
	 *
	 * @throws 当 WebGL 的 texStorage3D 方法失败时，将抛出异常并在控制台中记录错误。
	 *
	 * @see gl.texStorage3D
	 */
	function texStorage3D() {

		try {

			gl.texStorage3D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 将二维纹理图像数据上传到纹理对象
	 *
	 * @returns 无返回值
	 */
	function texImage2D() {

		try {

			gl.texImage2D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 加载3D纹理数据到纹理对象中
	 *
	 * @remarks
	 * 该函数通过调用WebGL上下文对象的texImage3D方法加载3D纹理数据到纹理对象中。
	 * 如果加载过程中发生错误，则会在控制台输出错误信息。
	 *
	 * @throws 无
	 */
	function texImage3D() {

		try {

			gl.texImage3D.apply(gl, arguments);

		} catch (error) {

			console.error('THREE.WebGLState:', error);

		}

	}

	/**
	 * 设置当前剪裁区域
	 *
	 * @param scissor 剪裁区域对象，包含x、y、z、w四个属性，分别代表剪裁区域的左上角x坐标、y坐标、宽度和高度
	 */
	function scissor(scissor) {

		if (currentScissor.equals(scissor) === false) {

			gl.scissor(scissor.x, scissor.y, scissor.z, scissor.w);
			currentScissor.copy(scissor);

		}

	}

	/**
	 * 设置当前视口大小
	 * 
	 * @param {Object} viewport - 包含视口信息的对象，包含x, y, z, w四个属性，分别代表视口的左下角x坐标，左下角y坐标，宽度和高度
	 * @description 如果传入的视口与当前视口不一致，则更新WebGL的视口设置，并更新当前视口为新的视口信息
	 */
	function viewport(viewport) {

		if (currentViewport.equals(viewport) === false) {

			gl.viewport(viewport.x, viewport.y, viewport.z, viewport.w);
			currentViewport.copy(viewport);

		}

	}

	/**
	 * 更新UBO映射关系
	 *
	 * @param uniformsGroup 统一的块对象
	 * @param program 着色器程序
	 */
	function updateUBOMapping(uniformsGroup, program) {

		let mapping = uboProgramMap.get(program);

		if (mapping === undefined) {

			mapping = new WeakMap();

			uboProgramMap.set(program, mapping);

		}

		let blockIndex = mapping.get(uniformsGroup);

		if (blockIndex === undefined) {

			blockIndex = gl.getUniformBlockIndex(program, uniformsGroup.name);

			mapping.set(uniformsGroup, blockIndex);

		}

	}

	/**
	 * 绑定统一块
	 *
	 * @param uniformsGroup 统一块组
	 * @param program WebGL程序
	 */
	function uniformBlockBinding(uniformsGroup, program) {

		const mapping = uboProgramMap.get(program);
		const blockIndex = mapping.get(uniformsGroup);

		if (uboBindings.get(program) !== blockIndex) {

			// bind shader specific block index to global block point
			gl.uniformBlockBinding(program, blockIndex, uniformsGroup.__bindingPointIndex);

			uboBindings.set(program, blockIndex);

		}

	}

	/**
	 * 重置 WebGL 上下文状态
	 */
	function reset() {
		// 禁用各种WebGL功能
		gl.disable(gl.BLEND);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		// 设置混合参数
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.ONE, gl.ZERO);
		gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO);
		gl.blendColor(0, 0, 0, 0);
		// 控制哪些颜色组件可以写入缓冲区
		gl.colorMask(true, true, true, true);
		gl.clearColor(0, 0, 0, 0);
		// 设置深度缓冲区的写入掩码和深度比较函数
		gl.depthMask(true);
		gl.depthFunc(gl.LESS);
		gl.clearDepth(1);
		// 设置模板缓冲区的参数
		gl.stencilMask(0xffffffff);
		gl.stencilFunc(gl.ALWAYS, 0, 0xffffffff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		gl.clearStencil(0);
		// 设置背面剔除
		gl.cullFace(gl.BACK);
		gl.frontFace(gl.CCW);
		// 设置多边形偏移 可以避免z-fighting 问题
		gl.polygonOffset(0, 0);
		// 设置活动纹理单元
		gl.activeTexture(gl.TEXTURE0);
		// 接触绑定帧缓冲
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		// 接触绑定当前的着色器程序
		gl.useProgram(null);
		// 设置线宽
		gl.lineWidth(1);
		// 设置裁剪矩形和视口
		gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// reset internals
		// 重置内部状态
		enabledCapabilities = {};

		currentTextureSlot = null;
		currentBoundTextures = {};

		currentBoundFramebuffers = {};
		currentDrawbuffers = new WeakMap();
		defaultDrawbuffers = [];

		currentProgram = null;

		currentBlendingEnabled = false;
		currentBlending = null;
		currentBlendEquation = null;
		currentBlendSrc = null;
		currentBlendDst = null;
		currentBlendEquationAlpha = null;
		currentBlendSrcAlpha = null;
		currentBlendDstAlpha = null;
		currentBlendColor = new Color(0, 0, 0);
		currentBlendAlpha = 0;
		currentPremultipledAlpha = false;

		currentFlipSided = null;
		currentCullFace = null;

		currentLineWidth = null;

		currentPolygonOffsetFactor = null;
		currentPolygonOffsetUnits = null;

		currentScissor.set(0, 0, gl.canvas.width, gl.canvas.height);
		currentViewport.set(0, 0, gl.canvas.width, gl.canvas.height);
		// 重置缓冲
		colorBuffer.reset();
		depthBuffer.reset();
		stencilBuffer.reset();

	}

	return {

		buffers: {
			color: colorBuffer,
			depth: depthBuffer,
			stencil: stencilBuffer
		},

		enable: enable,
		disable: disable,

		bindFramebuffer: bindFramebuffer,
		drawBuffers: drawBuffers,

		useProgram: useProgram,

		setBlending: setBlending,
		setMaterial: setMaterial,

		setFlipSided: setFlipSided,
		setCullFace: setCullFace,

		setLineWidth: setLineWidth,
		setPolygonOffset: setPolygonOffset,

		setScissorTest: setScissorTest,

		activeTexture: activeTexture,
		bindTexture: bindTexture,
		unbindTexture: unbindTexture,
		compressedTexImage2D: compressedTexImage2D,
		compressedTexImage3D: compressedTexImage3D,
		texImage2D: texImage2D,
		texImage3D: texImage3D,

		updateUBOMapping: updateUBOMapping,
		uniformBlockBinding: uniformBlockBinding,

		texStorage2D: texStorage2D,
		texStorage3D: texStorage3D,
		texSubImage2D: texSubImage2D,
		texSubImage3D: texSubImage3D,
		compressedTexSubImage2D: compressedTexSubImage2D,
		compressedTexSubImage3D: compressedTexSubImage3D,

		scissor: scissor,
		viewport: viewport,

		reset: reset

	};

}

export { WebGLState };
