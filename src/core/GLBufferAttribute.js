class GLBufferAttribute {

	/**
	 * 构造函数
	 *
	 * @param {WebGLBuffer} buffer WebGL缓冲区对象
	 * @param {number} type 数据类型，如 THREE.Float32Type
	 * @param {number} itemSize 每个元素的项数，例如，对于vec3，itemSize为3
	 * @param {number} elementSize 每个元素占用的字节数，例如，对于Float32，elementSize为4
	 * @param {number} count 元素的总数
	 */
	constructor( buffer, type, itemSize, elementSize, count ) {

		this.isGLBufferAttribute = true;

		this.name = '';

		this.buffer = buffer;
		this.type = type;
		this.itemSize = itemSize;
		this.elementSize = elementSize;
		this.count = count;

		this.version = 0;

	}

	set needsUpdate( value ) {

		if ( value === true ) this.version ++;

	}

	setBuffer( buffer ) {

		this.buffer = buffer;

		return this;

	}

	setType( type, elementSize ) {

		this.type = type;
		this.elementSize = elementSize;

		return this;

	}

	setItemSize( itemSize ) {

		this.itemSize = itemSize;

		return this;

	}

	setCount( count ) {

		this.count = count;

		return this;

	}

}

export { GLBufferAttribute };
