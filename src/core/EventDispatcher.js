/**
 * https://github.com/mrdoob/eventdispatcher.js/
 */

class EventDispatcher {

	/**
	 * 添加事件监听器
	 *
	 * @param {string} type 事件类型
	 * @param {Function} listener 事件处理函数
	 */
	addEventListener( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

			listeners[ type ].push( listener );

		}

	}

	/**
	 * 判断是否存在事件监听器
	 *
	 * @param {string} type 事件类型
	 * @param {Function} listener 事件监听器函数
	 * @returns {boolean} 如果存在指定类型的事件监听器，则返回 true；否则返回 false
	 */
	hasEventListener( type, listener ) {

		if ( this._listeners === undefined ) return false;

		const listeners = this._listeners;

		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1;

	}

	/**
	 * 从事件监听器中移除指定的事件监听器
	 *
	 * @param type 事件类型
	 * @param listener 需要移除的事件监听器函数
	 */
	removeEventListener( type, listener ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	/**
	 * 触发指定类型的事件。
	 *
	 * @param {Event} event - 要触发的事件对象。
	 * @returns {void}
	 */
	dispatchEvent( event ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice( 0 );

			for ( let i = 0, l = array.length; i < l; i ++ ) {

				array[ i ].call( this, event );

			}

			event.target = null;

		}

	}

}


export { EventDispatcher };
