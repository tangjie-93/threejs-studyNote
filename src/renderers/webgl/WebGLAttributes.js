/**
 * WebGLAttributes 构造函数，用于处理 WebGL 中的属性缓冲。
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文。
 * @returns {Object} 包含 get, remove, update 方法的对象。
 */
function WebGLAttributes( gl ) {

	const buffers = new WeakMap();

	/**
	 * 创建一个WebGL缓冲区对象
	 *
	 * @param attribute 属性对象，包含array和usage属性
	 * @param bufferType 缓冲区类型，WebGL枚举值
	 * @returns 返回包含缓冲区信息的对象，包含buffer、type、bytesPerElement、version和size属性
	 * @throws 当array不是支持的TypedArray类型时，抛出错误
	 */
	function createBuffer( attribute, bufferType ) {

		const array = attribute.array;
		const usage = attribute.usage;
		const size = array.byteLength;

		const buffer = gl.createBuffer();

		gl.bindBuffer( bufferType, buffer );
		gl.bufferData( bufferType, array, usage );
		/***
		 * 在webgl中创建和使用buffer
		 * 
		 *  const aposLocation = gl.getAttribLocation(program,'a_posotion');
			//类型数组构造函数Float32Array创建顶点数组
			const data=new Float32Array([0.5,0.5,-0.5,0.5,-0.5,-0.5,0.5,-0.5]);
			//创建缓冲区对象
			const buffer=gl.createBuffer();
			//绑定缓冲区对象,激活buffer
			gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
			//顶点数组data数据传入缓冲区
			gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
			//缓冲区中的数据按照一定的规律传递给位置变量aposLocation
			gl.vertexAttribPointer(aposLocation,2,gl.FLOAT,false,0,0);
			//允许数据传递(这句代码放在能获取到aposLocation的任意位置都可以)
			gl.enableVertexAttribArray(aposLocation);
		 * 
		 */

		attribute.onUploadCallback();

		let type;
		// 获取数据类型
		if ( array instanceof Float32Array ) {

			type = gl.FLOAT;

		} else if ( array instanceof Uint16Array ) {

			if ( attribute.isFloat16BufferAttribute ) {

				type = gl.HALF_FLOAT;

			} else {

				type = gl.UNSIGNED_SHORT;

			}

		} else if ( array instanceof Int16Array ) {

			type = gl.SHORT;

		} else if ( array instanceof Uint32Array ) {

			type = gl.UNSIGNED_INT;

		} else if ( array instanceof Int32Array ) {

			type = gl.INT;

		} else if ( array instanceof Int8Array ) {

			type = gl.BYTE;

		} else if ( array instanceof Uint8Array ) {

			type = gl.UNSIGNED_BYTE;

		} else if ( array instanceof Uint8ClampedArray ) {

			type = gl.UNSIGNED_BYTE;

		} else {

			throw new Error( 'THREE.WebGLAttributes: Unsupported buffer data format: ' + array );

		}

		return {
			buffer: buffer,
			type: type,
			bytesPerElement: array.BYTES_PER_ELEMENT,
			version: attribute.version,
			size: size
		};

	}

	/**
	 * 更新缓冲区
	 *
	 * @param buffer 缓冲区对象
	 * @param attribute 属性对象
	 * @param bufferType 缓冲区类型
	 */
	function updateBuffer( buffer, attribute, bufferType ) {

		const array = attribute.array;
		// @deprecated, r159
		const updateRange = attribute._updateRange; // @deprecated, r159
		const updateRanges = attribute.updateRanges;

		gl.bindBuffer( bufferType, buffer );

		if ( updateRange.count === - 1 && updateRanges.length === 0 ) {
			// 不使用更新范围
			// Not using update ranges
			gl.bufferSubData( bufferType, 0, array );
		}

		if ( updateRanges.length !== 0 ) {
			for ( let i = 0, l = updateRanges.length; i < l; i ++ ) {
				const range = updateRanges[ i ];
				// 根据更新范围更新缓冲区数据
				gl.bufferSubData( bufferType, range.start * array.BYTES_PER_ELEMENT,
					array, range.start, range.count );
			}
			// 清除更新范围
			attribute.clearUpdateRanges();
		}

		// @deprecated, r159
		if ( updateRange.count !== - 1 ) {
			// 根据单个更新范围更新缓冲区数据
			// @deprecated, r159
			gl.bufferSubData( bufferType, updateRange.offset * array.BYTES_PER_ELEMENT,
				array, updateRange.offset, updateRange.count );
			// 重置更新范围
			updateRange.count = - 1; // reset range
		}

		// 调用上传回调
		attribute.onUploadCallback();
	}

	function get( attribute ) {

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		return buffers.get( attribute );

	}

	/**
	 * 从缓冲区中移除指定的属性
	 *
	 * @param attribute 要移除的属性
	 * @returns 无返回值
	 */
	function remove( attribute ) {
		// 如果属性是交错缓冲区属性，则将属性替换为其数据
		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;
		// 获取属性对应的缓冲区数据
		const data = buffers.get( attribute );
		if ( data ) {
			// 删除WebGL缓冲区
			gl.deleteBuffer( data.buffer );
			// 从缓冲区集合中删除属性
			buffers.delete( attribute );
		}
	}

	/**
	 * 更新属性缓冲
	 *
	 * @param attribute 属性对象
	 * @param bufferType 缓冲类型
	 * @returns 无返回值
	 * @throws 当缓冲大小不匹配原始大小时，抛出错误
	 */
	function update( attribute, bufferType ) {
		// 如果 attribute 是 GLBufferAttribute 类型
		if ( attribute.isGLBufferAttribute ) {
			// 从 buffers 中获取 attribute 对应的缓存对象
			const cached = buffers.get( attribute );
			// 如果缓存对象不存在或者缓存对象的版本号小于 attribute 的版本号
			if ( ! cached || cached.version < attribute.version ) {
				// 更新缓存对象
				buffers.set( attribute, {
					buffer: attribute.buffer,
					type: attribute.type,
					bytesPerElement: attribute.elementSize,
					version: attribute.version
				} );
			}
			// 结束函数
			return;
		}

		// 如果 attribute 是 InterleavedBufferAttribute 类型，将其转换为 data
		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;
		// 从 buffers 中获取 attribute 对应的缓存数据
		const data = buffers.get( attribute );
		// 如果缓存数据不存在
		if ( data === undefined ) {
			// 创建缓存数据
			buffers.set( attribute, createBuffer( attribute, bufferType ) );
		// 如果缓存数据的版本号小于 attribute 的版本号
		} else if ( data.version < attribute.version ) {
			// 如果缓存数据的大小不等于 attribute 的数组缓冲区的大小
			if ( data.size !== attribute.array.byteLength ) {
				// 抛出错误，不支持调整缓冲区属性的大小
				throw new Error( 'THREE.WebGLAttributes: The size of the buffer attribute\'s array buffer does not match the original size. Resizing buffer attributes is not supported.' );
			}
			// 更新缓存数据对应的缓冲区
			updateBuffer( data.buffer, attribute, bufferType );

			// 更新缓存数据的版本号
			data.version = attribute.version;
		}
	}
	return {

		get: get,
		remove: remove,
		update: update

	};

}


export { WebGLAttributes };
