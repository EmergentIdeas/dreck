

import { ListView } from '@webhandle/drag-sortable-list'


/**
 * Expects markup in the form of:
 * <div class="ei-editable-sortable-tiles">
 * 		<ul class="tiles" data-sort-url="/admin/hierarchies/sort">
 * 			<li class="tile" data-id="e0e5e574-4709-48d9-8df1-167af79f4b1e"> <!-- Where the value of data-id is database identifier of the object represented by the tile -->
 * 				<!-- Some markup here which displays the information about the tile -->
 * 			</li>
 * 		</ul>
 * </div>
 * 
 * 
 */


let lists = document.querySelectorAll('.ei-editable-sortable-tiles .tiles')
if (lists && lists.length > 0) {
	for (let list of lists) {
		let listView = new ListView({
			el: list
			, mobileHandleSelector: '.move'
			, desktopHandleSelector: '.move'
			// , shouldInsertCellForExternalDrag: function(evt) {
			// 	return false
			// }
		})
		listView.render()
		let emitter = listView.emitter
		emitter.on('list-change', (evt) => {
			// get all the cells to update the order or something
			let cells = listView.getCells()
			let count = 0;
			let order = {}

			for (let cell of cells) {
				order[cell.getAttribute('data-id')] = count++
			}
			let url = list.getAttribute('data-sort-url')

			fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(order)
			})
		})
	}
}