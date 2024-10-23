class Layers {

	constructor() {
	    // 使用位运算符将1和0进行按位或操作，结果赋值给this.mask
		// 通过这种方式，无论初始值如何，都能确保this.mask的值为1
		this.mask = 1 | 0; 

	}

    /**
     * @description
     * 设置channel的值，并更新mask的值。
     * channel表示要修改的通道，取值为0到3之间的整数。
     * mask的初始值为0，每次调用set函数都会根据channel的值来更新mask的值。
     *
     * @param {number} channel - 要修改的通道，取值为0到3之间的整数。
     */
	set( channel ) {
		// 将channel的值左移一位，然后与0进行位或操作，保证结果为整数
		// 然后再进行无符号右移操作，再次保证结果为整数
		// 这个操作是为了确保mask是一个正整数，且只在该channel对应的位上为1，其余位为0
		this.mask = ( 1 << channel | 0 ) >>> 0;
		// 将计算后的mask值赋给this.mask
	}

    /**
     * @description 启用指定通道
     * @param {number} channel 需要启用的通道号，取值范围为0到7
     */
	enable( channel ) {

		// 将当前通道的位设置为1，然后将结果赋值给mask属性
		// 这里使用了位运算，将1左移channel位，然后与mask进行按位或操作，最后与0进行按位或操作（实际上这一步是多余的，可能是为了保持代码的一致性或者某种特定的编码风格）
		this.mask |= 1 << channel | 0;
		// 注释：|= 是按位或赋值运算符，它将左侧的变量与右侧的表达式进行按位或操作，并将结果赋值给左侧的变量
		// 注释：<< 是左移运算符，它将左侧的数的二进制表示向左移动指定的位数
		// 注释：| 是按位或运算符，它对两个数的每一位执行逻辑或操作

	}

    /**
     * 开启所有位，即开启所有功能
     *
     * @returns {void} 无返回值
     */
	enableAll() {
		// 将mask设置为全1，即开启所有位
		// 使用位或操作符(|)将0xffffffff与0进行位或操作，结果仍然是0xffffffff
		this.mask = 0xffffffff | 0;
		// 注释：这里0xffffffff是一个32位的十六进制数，转换为二进制后每一位都是1
		// 使用位或操作是因为任何数与0进行位或操作结果都是它本身
		// 所以这里实际上就是将mask设置为一个32位的全1数，表示开启所有位
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

    /**
     * @description
     * 禁用指定的通道。
     * 通过位运算，将对应通道的位设置为0，从而禁用该通道。
     *
     * @param {number} channel - 需要被禁用的通道，取值范围为0-7。
     *
     * @returns {void} 无返回值，直接修改当前对象的mask属性。
     */
	disable( channel ) {
		// 禁用指定的通道
		// 通过位运算，将对应通道的位设置为0
		// 这里的 (1 << channel | 0) 是为了生成一个在第channel位为1，其余位为0的数
		// 然后使用 ~ 操作符取反，得到一个在第channel位为0，其余位为1的数
		// 最后使用 &= 操作符，将当前对象的mask属性与上述生成的数进行按位与操作
		// 结果就是将mask中对应通道的位设置为0，达到禁用通道的目的
		this.mask &= ~ ( 1 << channel | 0 );

	}

    /**
     * 禁用所有功能
     *
     * @returns {void} - 无返回值
     */
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

    /**
     * @description
     * 判断指定通道是否开启。
     *
     * @param {number} channel - 通道号，从0开始计数。
     * @returns {boolean} 返回一个布尔值，表示指定通道是否开启。
     */
	isEnabled( channel ) {

		return ( this.mask & ( 1 << channel | 0 ) ) !== 0;

	}

}


export { Layers };
