class Layers {

	constructor() {

		this.mask = 1 | 0;

	}

	set( channel ) {

		this.mask = ( 1 << channel | 0 ) >>> 0;

	}

	enable( channel ) {

		this.mask |= 1 << channel | 0;

	}

	enableAll() {

		this.mask = 0xffffffff | 0;

	}

	/**
	 * 切换指定通道的遮罩状态
	 *
	 * @param channel 通道编号
	 * @returns 无返回值
	 */
	toggle( channel ) {

		// 将当前 mask 的对应 channel 位进行取反操作
		// 使用位移运算符 << 将 1 左移 channel 位，再通过按位或运算符 | 0 确保结果为整数
		// 最后将取反后的结果赋值给 this.mask
		this.mask ^= 1 << channel | 0;

	}

	disable( channel ) {

		this.mask &= ~ ( 1 << channel | 0 );

	}

	disableAll() {

		this.mask = 0;

	}

	/**
	 * 测试是否包含指定图层
	 *
	 * @param layers 要测试的图层对象
	 * @returns 如果当前对象包含指定图层则返回true，否则返回false
	 */
	test( layers ) {

		return ( this.mask & layers.mask ) !== 0;

	}

	isEnabled( channel ) {

		return ( this.mask & ( 1 << channel | 0 ) ) !== 0;

	}

}


export { Layers };
