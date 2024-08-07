/**
 * WebGLObjects 类
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {Map} geometries - 几何体映射表
 * @param {Map} attributes - 属性映射表
 * @param {Object} info - 渲染信息
 * @returns {Object} - 包含 update 和 dispose 方法的对象
 */
function WebGLObjects( gl, geometries, attributes, info ) {

	let updateMap = new WeakMap();

	/**
	 * 更新物体
	 *
	 * @param object 物体对象
	 * @returns 返回更新后的BufferGeometry对象
	 */
	function update( object ) {

		const frame = info.render.frame;

		const geometry = object.geometry;
		const buffergeometry = geometries.get( object, geometry );

		// Update once per frame

		if ( updateMap.get( buffergeometry ) !== frame ) {

			geometries.update( buffergeometry );

			updateMap.set( buffergeometry, frame );

		}

		if ( object.isInstancedMesh ) {

			if ( object.hasEventListener( 'dispose', onInstancedMeshDispose ) === false ) {

				object.addEventListener( 'dispose', onInstancedMeshDispose );

			}

			if ( updateMap.get( object ) !== frame ) {

				attributes.update( object.instanceMatrix, gl.ARRAY_BUFFER );

				if ( object.instanceColor !== null ) {

					attributes.update( object.instanceColor, gl.ARRAY_BUFFER );

				}

				updateMap.set( object, frame );

			}

		}

		if ( object.isSkinnedMesh ) {

			const skeleton = object.skeleton;

			if ( updateMap.get( skeleton ) !== frame ) {

				skeleton.update();

				updateMap.set( skeleton, frame );

			}

		}

		return buffergeometry;

	}

	function dispose() {

		updateMap = new WeakMap();

	}

	/**
	 * 销毁实例网格时触发的回调函数
	 *
	 * @param event 事件对象
	 */
	function onInstancedMeshDispose( event ) {

		const instancedMesh = event.target;

		instancedMesh.removeEventListener( 'dispose', onInstancedMeshDispose );

		attributes.remove( instancedMesh.instanceMatrix );

		if ( instancedMesh.instanceColor !== null ) attributes.remove( instancedMesh.instanceColor );

	}

	return {

		update: update,
		dispose: dispose

	};

}


export { WebGLObjects };
