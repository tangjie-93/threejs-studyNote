let _id = 0;

class WebGLShaderCache {

	constructor() {

		this.shaderCache = new Map();
		this.materialCache = new Map();

	}

	/**
	 * 更新材质着色器阶段
	 *
	 * @param material 材质对象
	 * @returns 返回当前对象
	 */
	update( material ) {

		// 获取顶点着色器
		const vertexShader = material.vertexShader;
		// 获取片元着色器
		const fragmentShader = material.fragmentShader;

		// 获取顶点着色器阶段
		const vertexShaderStage = this._getShaderStage( vertexShader );
		// 获取片元着色器阶段
		const fragmentShaderStage = this._getShaderStage( fragmentShader );

		// 获取该材质对应的着色器缓存
		const materialShaders = this._getShaderCacheForMaterial( material );

		// 如果材质着色器缓存中不存在顶点着色器阶段
		if ( materialShaders.has( vertexShaderStage ) === false ) {

			// 将顶点着色器阶段添加到材质着色器缓存中
			materialShaders.add( vertexShaderStage );
			// 顶点着色器阶段的使用次数加1
			vertexShaderStage.usedTimes ++;

		}

		// 如果材质着色器缓存中不存在片元着色器阶段
		if ( materialShaders.has( fragmentShaderStage ) === false ) {

			// 将片元着色器阶段添加到材质着色器缓存中
			materialShaders.add( fragmentShaderStage );
			// 片元着色器阶段的使用次数加1
			fragmentShaderStage.usedTimes ++;

		}

		// 返回当前对象
		return this;

	}

	/**
	 * 移除材料缓存中的材料和关联的着色器
	 *
	 * @param material 材料实例
	 * @returns 返回当前实例
	 */
	remove( material ) {

		const materialShaders = this.materialCache.get( material );

		for ( const shaderStage of materialShaders ) {

			shaderStage.usedTimes --;

			if ( shaderStage.usedTimes === 0 ) this.shaderCache.delete( shaderStage.code );

		}

		this.materialCache.delete( material );

		return this;

	}

	getVertexShaderID( material ) {

		return this._getShaderStage( material.vertexShader ).id;

	}

	getFragmentShaderID( material ) {

		return this._getShaderStage( material.fragmentShader ).id;

	}

	dispose() {

		this.shaderCache.clear();
		this.materialCache.clear();

	}

	_getShaderCacheForMaterial( material ) {

		const cache = this.materialCache;
		let set = cache.get( material );

		if ( set === undefined ) {

			set = new Set();
			cache.set( material, set );

		}

		return set;

	}

	_getShaderStage( code ) {

		const cache = this.shaderCache;
		let stage = cache.get( code );

		if ( stage === undefined ) {

			stage = new WebGLShaderStage( code );
			cache.set( code, stage );

		}

		return stage;

	}

}

class WebGLShaderStage {

	constructor( code ) {

		this.id = _id ++;

		this.code = code;
		this.usedTimes = 0;

	}

}

export { WebGLShaderCache };
