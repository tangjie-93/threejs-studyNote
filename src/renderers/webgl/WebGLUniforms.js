/**
 * Uniforms of a program.
 * Those form a tree structure with a special top-level container for the root,
 * which you get by calling 'new WebGLUniforms( gl, program )'.
 *
 *
 * Properties of inner nodes including the top-level container:
 *
 * .seq - array of nested uniforms
 * .map - nested uniforms by name
 *
 *
 * Methods of all nodes except the top-level container:
 *
 * .setValue( gl, value, [textures] )
 *
 * 		uploads a uniform value(s)
 *  	the 'textures' parameter is needed for sampler uniforms
 *
 *
 * Static methods of the top-level container (textures factorizations):
 *
 * .upload( gl, seq, values, textures )
 *
 * 		sets uniforms in 'seq' to 'values[id].value'
 *
 * .seqWithValue( seq, values ) : filteredSeq
 *
 * 		filters 'seq' entries with corresponding entry in values
 *
 *
 * Methods of the top-level container (textures factorizations):
 *
 * .setValue( gl, name, value, textures )
 *
 * 		sets uniform with  name 'name' to 'value'
 *
 * .setOptional( gl, obj, prop )
 *
 * 		like .set for an optional property of the object
 *
 */

import { CubeTexture } from '../../textures/CubeTexture.js';
import { Texture } from '../../textures/Texture.js';
import { DataArrayTexture } from '../../textures/DataArrayTexture.js';
import { Data3DTexture } from '../../textures/Data3DTexture.js';
import { DepthTexture } from '../../textures/DepthTexture.js';
import { LessEqualCompare } from '../../constants.js';

const emptyTexture = /*@__PURE__*/ new Texture();

const emptyShadowTexture = /*@__PURE__*/ new DepthTexture( 1, 1 );

const emptyArrayTexture = /*@__PURE__*/ new DataArrayTexture();
const empty3dTexture = /*@__PURE__*/ new Data3DTexture();
const emptyCubeTexture = /*@__PURE__*/ new CubeTexture();

// --- Utilities ---

// Array Caches (provide typed arrays for temporary by size)

const arrayCacheF32 = [];
const arrayCacheI32 = [];

// Float32Array caches used for uploading Matrix uniforms

const mat4array = new Float32Array( 16 );
const mat3array = new Float32Array( 9 );
const mat2array = new Float32Array( 4 );

// Flattening for arrays of vectors and matrices

/**
 * 将数组扁平化为一维数组
 *
 * @param array 待处理的数组
 * @param nBlocks 块的数量
 * @param blockSize 块的大小
 * @returns 扁平化后的一维数组
 */
function flatten( array, nBlocks, blockSize ) {
	const firstElem = array[ 0 ];
	// 如果第一个元素小于等于0或大于0，则直接返回原数组
	if ( firstElem <= 0 || firstElem > 0 ) return array;
	const n = nBlocks * blockSize;
	let r = arrayCacheF32[ n ];
	if ( r === undefined ) {
		// 如果缓存中没有对应长度的 Float32Array，则创建一个新的
		r = new Float32Array( n );
		arrayCacheF32[ n ] = r;
	}
	if ( nBlocks !== 0 ) {
		// 将第一个元素转换为数组并存储到 r 中
		firstElem.toArray( r, 0 );
		for ( let i = 1, offset = 0; i !== nBlocks; ++ i ) {
			// 计算下一个元素的偏移量
			offset += blockSize;
			// 将当前元素转换为数组并存储到 r 的对应位置
			array[ i ].toArray( r, offset );
		}
	}
	// 返回合并后的数组
	return r;

}

/**
 * 判断两个数组是否相等
 *
 * @param a 数组a
 * @param b 数组b
 * @returns 如果数组a和数组b相等则返回true，否则返回false
 */
function arraysEqual( a, b ) {

	if ( a.length !== b.length ) return false;

	for ( let i = 0, l = a.length; i < l; i ++ ) {

		if ( a[ i ] !== b[ i ] ) return false;

	}

	return true;

}

/**
 * 复制数组
 *
 * @param a 目标数组
 * @param b 源数组
 * @returns 无返回值
 */
function copyArray( a, b ) {

	for ( let i = 0, l = b.length; i < l; i ++ ) {

		a[ i ] = b[ i ];

	}

}
/**
 * 分配纹理单元
 *
 * @param textures 纹理对象
 * @param n 分配纹理单元的数量
 * @returns 返回一个包含分配到的纹理单元编号的整型数组
 */
function allocTexUnits( textures, n ) {
	// 从数组缓存中获取指定大小的数组
	let r = arrayCacheI32[ n ];
	// 如果数组为空，则创建一个新的数组并存储到数组缓存中
	if ( r === undefined ) {
		r = new Int32Array( n );
		arrayCacheI32[ n ] = r;
	}
	// 遍历数组，为每个纹理分配纹理单元
	for ( let i = 0; i !== n; ++ i ) {
		r[ i ] = textures.allocateTextureUnit();
	}
	// 返回分配好的纹理单元数组
	return r;
}

// --- Setters ---

// Note: Defining these methods externally, because they come in a bunch
// and this way their names minify.

// Single scalar

/**
 * 设置单个浮点数值到WebGL着色器的uniform变量中
 *
 * @param gl WebGL上下文对象
 * @param v 浮点数值
 * @returns 无返回值
 */
function setValueV1f( gl, v ) {
	const cache = this.cache;
	if ( cache[ 0 ] === v ) return;
	gl.uniform1f( this.addr, v );
	cache[ 0 ] = v;
}

// Single float vector (from flat array or THREE.VectorN)

/**
 *  设置2个浮点数值到WebGL着色器的uniform变量中
 *
 * @param gl WebGLRenderingContext对象
 * @param v 包含x,y属性的对象或Float32Array数组
 * @returns 无返回值
 */
function setValueV2f( gl, v ) {
	const cache = this.cache;
	if ( v.x !== undefined ) {
		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {
			gl.uniform2f( this.addr, v.x, v.y );
			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
		}
	} else {
		if ( arraysEqual( cache, v ) ) return;
		gl.uniform2fv( this.addr, v );
		copyArray( cache, v );
	}
}

/**
 * 设置WebGL的uniform变量为3个浮点数的值
 *
 * @param gl WebGL渲染上下文
 * @param v 浮点数对象或者包含浮点数的数组，如果是对象需要包含属性x,y,z或r,g,b
 */
function setValueV3f( gl, v ) {
	const cache = this.cache;
	if ( v.x !== undefined ) {
		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {
			gl.uniform3f( this.addr, v.x, v.y, v.z );
			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;
		}
	} else if ( v.r !== undefined ) {
		if ( cache[ 0 ] !== v.r || cache[ 1 ] !== v.g || cache[ 2 ] !== v.b ) {
			gl.uniform3f( this.addr, v.r, v.g, v.b );
			cache[ 0 ] = v.r;
			cache[ 1 ] = v.g;
			cache[ 2 ] = v.b;
		}
	} else {
		if ( arraysEqual( cache, v ) ) return;
		gl.uniform3fv( this.addr, v );
		copyArray( cache, v );
	}
}

/**
 * 设置WebGL的uniform变量为vec4类型的值
 *
 * @param gl WebGL渲染上下文
 * @param v vec4类型的值，可以是一个包含x,y,z,w属性的对象或者是一个Float32Array类型的数组
 * @returns 无返回值
 */
function setValueV4f( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

			gl.uniform4f( this.addr, v.x, v.y, v.z, v.w );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;
			cache[ 3 ] = v.w;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform4fv( this.addr, v );

		copyArray( cache, v );

	}

}

// Single matrix (from flat array or THREE.MatrixN)

/**
 * 设置矩阵2的值
 *
 * @param gl WebGL上下文
 * @param v 矩阵2的值，可以是数组或对象
 * @returns 无返回值
 */
function setValueM2( gl, v ) {

	const cache = this.cache;
	const elements = v.elements;

	if ( elements === undefined ) {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniformMatrix2fv( this.addr, false, v );

		copyArray( cache, v );

	} else {

		if ( arraysEqual( cache, elements ) ) return;

		mat2array.set( elements );

		gl.uniformMatrix2fv( this.addr, false, mat2array );

		copyArray( cache, elements );

	}

}

/**
 * 设置矩阵值（3x3）
 *
 * @param gl WebGLRenderingContext 对象
 * @param v 包含矩阵元素的数组或对象
 * @returns 无返回值
 */
function setValueM3( gl, v ) {

	const cache = this.cache;
	const elements = v.elements;

	if ( elements === undefined ) {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniformMatrix3fv( this.addr, false, v );

		copyArray( cache, v );

	} else {

		if ( arraysEqual( cache, elements ) ) return;

		mat3array.set( elements );

		gl.uniformMatrix3fv( this.addr, false, mat3array );

		copyArray( cache, elements );

	}

}

/**
 * 设置矩阵值到 WebGL 上下文中的指定位置
 *
 * @param gl WebGL 渲染上下文
 * @param v 矩阵值，可以是 Float32Array 类型或包含 elements 属性的对象
 * @returns 无返回值
 */
function setValueM4( gl, v ) {

	const cache = this.cache;
	const elements = v.elements;

	if ( elements === undefined ) {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniformMatrix4fv( this.addr, false, v );

		copyArray( cache, v );

	} else {

		if ( arraysEqual( cache, elements ) ) return;

		mat4array.set( elements );

		gl.uniformMatrix4fv( this.addr, false, mat4array );

		copyArray( cache, elements );

	}

}

// Single integer / boolean

/**
 * 设置WebGL的uniform变量为1个整型/布尔的值
 *
 * @param gl WebGL渲染上下文
 * @param v 需要设置的值
 * @returns 无返回值
 */
function setValueV1i( gl, v ) {
	const cache = this.cache;
	if ( cache[ 0 ] === v ) return;
	gl.uniform1i( this.addr, v );
	cache[ 0 ] = v;
}

// Single integer / boolean vector (from flat array or THREE.VectorN)
/**
 * 设置WebGL的uniform变量为2个整型/布尔的值
 *
 * @param gl WebGL 渲染上下文
 * @param v 要设置的 uniform 值，类型为对象或数组
 * @returns 无返回值
 */
function setValueV2i( gl, v ) {
	const cache = this.cache;
	if ( v.x !== undefined ) {
		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {
			gl.uniform2i( this.addr, v.x, v.y );
			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
		}
	} else {
		if ( arraysEqual( cache, v ) ) return;
		gl.uniform2iv( this.addr, v );
		copyArray( cache, v );
	}
}

/**
 * 设置 WebGL 着色器中的 3 个 int 类型的一致变量值
 *
 * @param gl WebGL 渲染上下文
 * @param v 包含 x, y, z 属性的对象或 int 类型的数组
 */
function setValueV3i( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {

			gl.uniform3i( this.addr, v.x, v.y, v.z );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform3iv( this.addr, v );

		copyArray( cache, v );

	}

}

function setValueV4i( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

			gl.uniform4i( this.addr, v.x, v.y, v.z, v.w );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;
			cache[ 3 ] = v.w;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform4iv( this.addr, v );

		copyArray( cache, v );

	}

}

// Single unsigned integer

function setValueV1ui( gl, v ) {

	const cache = this.cache;

	if ( cache[ 0 ] === v ) return;

	gl.uniform1ui( this.addr, v );

	cache[ 0 ] = v;

}

// Single unsigned integer vector (from flat array or THREE.VectorN)

function setValueV2ui( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {

			gl.uniform2ui( this.addr, v.x, v.y );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform2uiv( this.addr, v );

		copyArray( cache, v );

	}

}

function setValueV3ui( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {

			gl.uniform3ui( this.addr, v.x, v.y, v.z );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform3uiv( this.addr, v );

		copyArray( cache, v );

	}

}

function setValueV4ui( gl, v ) {

	const cache = this.cache;

	if ( v.x !== undefined ) {

		if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

			gl.uniform4ui( this.addr, v.x, v.y, v.z, v.w );

			cache[ 0 ] = v.x;
			cache[ 1 ] = v.y;
			cache[ 2 ] = v.z;
			cache[ 3 ] = v.w;

		}

	} else {

		if ( arraysEqual( cache, v ) ) return;

		gl.uniform4uiv( this.addr, v );

		copyArray( cache, v );

	}

}


// Single texture (2D / Cube)

/**
 * 设置纹理值T1
 *
 * @param gl WebGL渲染上下文
 * @param v 纹理对象，默认为空纹理
 * @param textures 纹理管理器对象
 * @returns 无返回值
 */
function setValueT1( gl, v, textures ) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if ( cache[ 0 ] !== unit ) {
		gl.uniform1i( this.addr, unit );
		cache[ 0 ] = unit;
	}
	let emptyTexture2D;
	if ( this.type === gl.SAMPLER_2D_SHADOW ) {
		emptyShadowTexture.compareFunction = LessEqualCompare; // #28670
		emptyTexture2D = emptyShadowTexture;
	} else {
		emptyTexture2D = emptyTexture;
	}
	textures.setTexture2D( v || emptyTexture2D, unit );
}

/**
 * 设置3D纹理值
 *
 * @param gl WebGL渲染上下文
 * @param v 3D纹理数据，默认为空3D纹理
 * @param textures 纹理管理器对象
 */
function setValueT3D1( gl, v, textures ) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if ( cache[ 0 ] !== unit ) {
		gl.uniform1i( this.addr, unit );
		cache[ 0 ] = unit;
	}
	textures.setTexture3D( v || empty3dTexture, unit );
}

/**
 * 设置纹理立方体的值
 *
 * @param gl WebGLRenderingContext 对象
 * @param v 纹理立方体对象，默认为空纹理立方体
 * @param textures 纹理管理器对象
 */
function setValueT6( gl, v, textures ) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if ( cache[ 0 ] !== unit ) {
		gl.uniform1i( this.addr, unit );
		cache[ 0 ] = unit;
	}
	textures.setTextureCube( v || emptyCubeTexture, unit );

}

/**
 * 设置二维纹理数组的值
 *
 * @param gl WebGL渲染上下文
 * @param v 纹理数组值，默认为空纹理数组
 * @param textures 纹理管理对象
 */
function setValueT2DArray1( gl, v, textures ) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if ( cache[ 0 ] !== unit ) {
		gl.uniform1i( this.addr, unit );
		cache[ 0 ] = unit;
	}
	textures.setTexture2DArray( v || emptyArrayTexture, unit );
}

// Helper to pick the right setter for the singular case

/**
 * 根据类型获取单个属性的设置函数
 *
 * @param type 类型值
 * @returns 返回对应的设置函数，若未找到则返回undefined
 */
function getSingularSetter( type ) {

	switch ( type ) {

		case 0x1406: return setValueV1f; // FLOAT
		case 0x8b50: return setValueV2f; // _VEC2
		case 0x8b51: return setValueV3f; // _VEC3
		case 0x8b52: return setValueV4f; // _VEC4

		case 0x8b5a: return setValueM2; // _MAT2
		case 0x8b5b: return setValueM3; // _MAT3
		case 0x8b5c: return setValueM4; // _MAT4

		case 0x1404: case 0x8b56: return setValueV1i; // INT, BOOL
		case 0x8b53: case 0x8b57: return setValueV2i; // _VEC2
		case 0x8b54: case 0x8b58: return setValueV3i; // _VEC3
		case 0x8b55: case 0x8b59: return setValueV4i; // _VEC4

		case 0x1405: return setValueV1ui; // UINT
		case 0x8dc6: return setValueV2ui; // _VEC2
		case 0x8dc7: return setValueV3ui; // _VEC3
		case 0x8dc8: return setValueV4ui; // _VEC4

		case 0x8b5e: // SAMPLER_2D
		case 0x8d66: // SAMPLER_EXTERNAL_OES
		case 0x8dca: // INT_SAMPLER_2D
		case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
		case 0x8b62: // SAMPLER_2D_SHADOW
			return setValueT1;

		case 0x8b5f: // SAMPLER_3D
		case 0x8dcb: // INT_SAMPLER_3D
		case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
			return setValueT3D1;

		case 0x8b60: // SAMPLER_CUBE
		case 0x8dcc: // INT_SAMPLER_CUBE
		case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
		case 0x8dc5: // SAMPLER_CUBE_SHADOW
			return setValueT6;

		case 0x8dc1: // SAMPLER_2D_ARRAY
		case 0x8dcf: // INT_SAMPLER_2D_ARRAY
		case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
		case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
			return setValueT2DArray1;

	}

}


// Array of scalars

/**
 * 设置WebGL中float类型一维数组的统一变量值
 *
 * @param gl WebGL上下文
 * @param v float类型一维数组
 */
function setValueV1fArray( gl, v ) {

	gl.uniform1fv( this.addr, v );

}

// Array of vectors (from flat array or array of THREE.VectorN)

/**
 * 设置WebGL的2f数组类型的uniform变量值
 *
 * @param gl WebGL上下文
 * @param v 待设置的2f数组
 */
function setValueV2fArray( gl, v ) {

	const data = flatten( v, this.size, 2 );

	gl.uniform2fv( this.addr, data );

}

function setValueV3fArray( gl, v ) {

	const data = flatten( v, this.size, 3 );

	gl.uniform3fv( this.addr, data );

}

function setValueV4fArray( gl, v ) {

	const data = flatten( v, this.size, 4 );

	gl.uniform4fv( this.addr, data );

}

// Array of matrices (from flat array or array of THREE.MatrixN)

function setValueM2Array( gl, v ) {

	const data = flatten( v, this.size, 4 );

	gl.uniformMatrix2fv( this.addr, false, data );

}

function setValueM3Array( gl, v ) {

	const data = flatten( v, this.size, 9 );

	gl.uniformMatrix3fv( this.addr, false, data );

}

function setValueM4Array( gl, v ) {

	const data = flatten( v, this.size, 16 );

	gl.uniformMatrix4fv( this.addr, false, data );

}

// Array of integer / boolean

/**
 * 设置 gl.uniform1iv 的值
 *
 * @param gl WebGLRenderingContext 对象
 * @param v Integer 数组
 */
function setValueV1iArray( gl, v ) {

	gl.uniform1iv( this.addr, v );

}

// Array of integer / boolean vectors (from flat array)

function setValueV2iArray( gl, v ) {

	gl.uniform2iv( this.addr, v );

}

function setValueV3iArray( gl, v ) {

	gl.uniform3iv( this.addr, v );

}

function setValueV4iArray( gl, v ) {

	gl.uniform4iv( this.addr, v );

}

// Array of unsigned integer

function setValueV1uiArray( gl, v ) {

	gl.uniform1uiv( this.addr, v );

}

// Array of unsigned integer vectors (from flat array)

function setValueV2uiArray( gl, v ) {

	gl.uniform2uiv( this.addr, v );

}

function setValueV3uiArray( gl, v ) {

	gl.uniform3uiv( this.addr, v );

}

function setValueV4uiArray( gl, v ) {

	gl.uniform4uiv( this.addr, v );

}


// Array of textures (2D / 3D / Cube / 2DArray)

function setValueT1Array( gl, v, textures ) {

	const cache = this.cache;

	const n = v.length;

	const units = allocTexUnits( textures, n );

	if ( ! arraysEqual( cache, units ) ) {

		gl.uniform1iv( this.addr, units );

		copyArray( cache, units );

	}

	for ( let i = 0; i !== n; ++ i ) {

		textures.setTexture2D( v[ i ] || emptyTexture, units[ i ] );

	}

}

function setValueT3DArray( gl, v, textures ) {

	const cache = this.cache;

	const n = v.length;

	const units = allocTexUnits( textures, n );

	if ( ! arraysEqual( cache, units ) ) {

		gl.uniform1iv( this.addr, units );

		copyArray( cache, units );

	}

	for ( let i = 0; i !== n; ++ i ) {

		textures.setTexture3D( v[ i ] || empty3dTexture, units[ i ] );

	}

}

function setValueT6Array( gl, v, textures ) {

	const cache = this.cache;

	const n = v.length;

	const units = allocTexUnits( textures, n );

	if ( ! arraysEqual( cache, units ) ) {

		gl.uniform1iv( this.addr, units );

		copyArray( cache, units );

	}

	for ( let i = 0; i !== n; ++ i ) {

		textures.setTextureCube( v[ i ] || emptyCubeTexture, units[ i ] );

	}

}

function setValueT2DArrayArray( gl, v, textures ) {

	const cache = this.cache;

	const n = v.length;

	const units = allocTexUnits( textures, n );

	if ( ! arraysEqual( cache, units ) ) {

		gl.uniform1iv( this.addr, units );

		copyArray( cache, units );

	}

	for ( let i = 0; i !== n; ++ i ) {

		textures.setTexture2DArray( v[ i ] || emptyArrayTexture, units[ i ] );

	}

}


// Helper to pick the right setter for a pure (bottom-level) array

/**
 * 根据类型获取纯数组设置器函数
 *
 * @param type 类型
 * @returns 对应的纯数组设置器函数
 */
function getPureArraySetter( type ) {

	switch ( type ) {

		case 0x1406: return setValueV1fArray; // FLOAT
		case 0x8b50: return setValueV2fArray; // _VEC2
		case 0x8b51: return setValueV3fArray; // _VEC3
		case 0x8b52: return setValueV4fArray; // _VEC4

		case 0x8b5a: return setValueM2Array; // _MAT2
		case 0x8b5b: return setValueM3Array; // _MAT3
		case 0x8b5c: return setValueM4Array; // _MAT4

		case 0x1404: case 0x8b56: return setValueV1iArray; // INT, BOOL
		case 0x8b53: case 0x8b57: return setValueV2iArray; // _VEC2
		case 0x8b54: case 0x8b58: return setValueV3iArray; // _VEC3
		case 0x8b55: case 0x8b59: return setValueV4iArray; // _VEC4

		case 0x1405: return setValueV1uiArray; // UINT
		case 0x8dc6: return setValueV2uiArray; // _VEC2
		case 0x8dc7: return setValueV3uiArray; // _VEC3
		case 0x8dc8: return setValueV4uiArray; // _VEC4

		case 0x8b5e: // SAMPLER_2D
		case 0x8d66: // SAMPLER_EXTERNAL_OES
		case 0x8dca: // INT_SAMPLER_2D
		case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
		case 0x8b62: // SAMPLER_2D_SHADOW
			return setValueT1Array;

		case 0x8b5f: // SAMPLER_3D
		case 0x8dcb: // INT_SAMPLER_3D
		case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
			return setValueT3DArray;

		case 0x8b60: // SAMPLER_CUBE
		case 0x8dcc: // INT_SAMPLER_CUBE
		case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
		case 0x8dc5: // SAMPLER_CUBE_SHADOW
			return setValueT6Array;

		case 0x8dc1: // SAMPLER_2D_ARRAY
		case 0x8dcf: // INT_SAMPLER_2D_ARRAY
		case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
		case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
			return setValueT2DArrayArray;

	}

}

// --- Uniform Classes ---

class SingleUniform {

	constructor( id, activeInfo, addr ) {

		this.id = id;
		this.addr = addr;
		this.cache = [];
		this.type = activeInfo.type;
		this.setValue = getSingularSetter( activeInfo.type );

		// this.path = activeInfo.name; // DEBUG

	}

}

class PureArrayUniform {

	constructor( id, activeInfo, addr ) {

		this.id = id;
		this.addr = addr;
		this.cache = [];
		this.type = activeInfo.type;
		this.size = activeInfo.size;
		this.setValue = getPureArraySetter( activeInfo.type );

		// this.path = activeInfo.name; // DEBUG

	}

}

class StructuredUniform {
	constructor( id ) {
		this.id = id;
		this.seq = [];
		this.map = {};
	}
	setValue( gl, value, textures ) {
		const seq = this.seq;
		for ( let i = 0, n = seq.length; i !== n; ++ i ) {
			const u = seq[ i ];
			u.setValue( gl, value[ u.id ], textures );
		}
	}
}

// --- Top-level ---

// Parser - builds up the property tree from the path strings

const RePathPart = /(\w+)(\])?(\[|\.)?/g;

// extracts
// 	- the identifier (member name or array index)
//  - followed by an optional right bracket (found when array index)
//  - followed by an optional left bracket or dot (type of subscript)
//
// Note: These portions can be read in a non-overlapping fashion and
// allow straightforward parsing of the hierarchy that WebGL encodes
// in the uniform names.

/**
 * 向容器中添加uniform对象
 *
 * @param container 容器对象，包含seq数组和map对象
 * @param uniformObject 要添加的uniform对象
 */
function addUniform( container, uniformObject ) {
	container.seq.push( uniformObject );
	container.map[ uniformObject.id ] = uniformObject;
}

/**
 * 解析uniform信息
 *
 * @param activeInfo active信息对象
 * @param addr 地址
 * @param container 容器对象
 * @returns 无返回值
 */
function parseUniform( activeInfo, addr, container ) {
	const path = activeInfo.name,
		pathLength = path.length;
	// 重置RegExp对象，因为之前的运行可能提前退出了
	RePathPart.lastIndex = 0;
	while ( true ) {
		const match = RePathPart.exec( path ),
			matchEnd = RePathPart.lastIndex;
		let id = match[ 1 ];
		const idIsIndex = match[ 2 ] === ']',
			subscript = match[ 3 ];
		if ( idIsIndex ) id = id | 0; // 转换为整数
		if ( subscript === undefined || subscript === '[' && matchEnd + 2 === pathLength ) {
			// 裸名或纯底层数组 "[0]" 后缀
			addUniform( container, subscript === undefined ?
				new SingleUniform( id, activeInfo, addr ) :
				new PureArrayUniform( id, activeInfo, addr ) );

			break;

		} else {
			// 进入内部节点/如果不存在则创建它
			const map = container.map;
			let next = map[ id ];
			if ( next === undefined ) {
				next = new StructuredUniform( id );
				addUniform( container, next );
			}
			container = next;
		}
	}
}

// Root Container

class WebGLUniforms {

	/**
	 * 构造函数
	 *
	 * @param gl WebGLRenderingContext 对象
	 * @param program WebGLProgram 对象
	 */
	constructor( gl, program ) {

		this.seq = [];
		this.map = {};

		const n = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );

		for ( let i = 0; i < n; ++ i ) {

			const info = gl.getActiveUniform( program, i ),
				addr = gl.getUniformLocation( program, info.name );

			parseUniform( info, addr, this );

		}

	}

	setValue( gl, name, value, textures ) {

		const u = this.map[ name ];

		if ( u !== undefined ) u.setValue( gl, value, textures );

	}

	/**
	 * 设置可选属性
	 *
	 * @param gl WebGL上下文对象
	 * @param object 包含属性的对象
	 * @param name 属性名
	 */
	setOptional( gl, object, name ) {

		const v = object[ name ];

		if ( v !== undefined ) this.setValue( gl, name, v );

	}

	/**
	 * 上传数据
	 *
	 * @param gl WebGLRenderingContext 上下文对象
	 * @param seq 包含上传序列的数组
	 * @param values 包含数据值的对象数组
	 * @param textures 纹理对象数组
	 * @returns 无返回值
	 */
	static upload( gl, seq, values, textures ) {
		// 遍历序列数组
		for ( let i = 0, n = seq.length; i !== n; ++ i ) {
			// 获取当前序列和对应的值
			const u = seq[ i ],
				v = values[ u.id ];
			// 如果值需要更新
			if ( v.needsUpdate !== false ) {
				// 注意：当 .needsUpdate 未定义时，总是进行更新
				// 设置值到序列中
				u.setValue( gl, v.value, textures );
			}
		}
	}
	/**
	 * 根据给定的序列和值数组，返回序列中所有id存在于值数组中的元素所组成的数组
	 *
	 * @param seq 给定的序列
	 * @param values 值数组
	 * @returns 序列中所有id存在于值数组中的元素所组成的数组
	 */
	static seqWithValue( seq, values ) {
		const r = [];
		for ( let i = 0, n = seq.length; i !== n; ++ i ) {
			const u = seq[ i ];
			if ( u.id in values ) r.push( u );
		}
		return r;
	}
}
export { WebGLUniforms };
