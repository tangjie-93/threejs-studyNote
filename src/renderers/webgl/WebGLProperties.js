/**
 * WebGLProperties 构造函数
 * 用于管理WebGL对象的属性
 *
 * @returns 返回包含get、remove、update、dispose方法的对象
 */
function WebGLProperties() {
	let properties = new WeakMap();
	function get( object ) {
		let map = properties.get( object );
		if ( map === undefined ) {
			map = {};
			properties.set( object, map );
		}
		return map;

	}

	/**
	 * 从 properties 集合中移除指定对象
	 *
	 * @param object 要移除的对象
	 * @returns 无返回值
	 */
	function remove( object ) {
		properties.delete( object );
	}
	function update( object, key, value ) {
		properties.get( object )[ key ] = value;
	}

	function dispose() {
		properties = new WeakMap();
	}
	return {
		get: get,
		remove: remove,
		update: update,
		dispose: dispose
	};
}
export { WebGLProperties };