// pin = [string m_name, string m_form, float m_x, float m_y, float m_angle]
// component = [string m_name, map<string, pin> m_pin_map]
// rule = [float m_radius, float m_gap, points_2d[] m_shape]
// instance = [string m_name, string m_comp, string m_side, float m_x, float m_y, float m_angle]
// circuit = [string m_via, rule m_rule]

"use strict";

function dsn2pcb(dsn, gap)
{
	let EOF = -1;
	let stream = [dsn, 0];

	//peek next char from stream
	function peek(stream)
	{
		if (stream[1] === stream[0].length) return EOF;
		return stream[0].charAt(stream[1]);
	}

	//get next char from stream
	function get(stream)
	{
		if (stream[1] === stream[0].length) return EOF;
		return stream[0].charAt(stream[1]++);
	}

	//read input till given byte appears
	function read_until(stream, c)
	{
		for (;;)
		{
			let input = get(stream);
			if (input === EOF) break;
			if (input === c) return false;
		}
		return true;
	}

	//read whitespace
	function read_whitespace(stream)
	{
		for (;;)
		{
			let b = peek(stream);
			if (b !== '\t' && b !== '\n' && b !== '\r' && b !== ' ') break;
			get(stream);
		}
	}

	function read_node_name(stream)
	{
		let s = "";
		for (;;)
		{
			let b = peek(stream);
			if (b === '\t' || b === '\n' || b === '\r' || b === ' ' || b === ')') break;
			s += get(stream);
		}
		return s;
	}

	function read_string(stream)
	{
		let s = "";
		for (;;)
		{
			let b = peek(stream);
			if (b === '\t' || b === '\n' || b === '\r' || b === ' ' || b === ')') break;
			s += get(stream);
		}
		return [s, []];
	}

	function read_quoted_string(stream)
	{
		let s = "";
		for (;;)
		{
			let b = peek(stream);
			if (b === '"') break;
			s += get(stream);
		}
		return [s, []];
	}

	function read_tree(stream)
	{
		read_until(stream, '(');
		read_whitespace(stream);
		let t = [read_node_name(stream), []];
		for (;;)
		{
			read_whitespace(stream);
			let b = peek(stream);
			if (b === EOF) break;
			if (b === ')')
			{
				get(stream);
				break;
			}
			if (b === '(')
			{
				t[1].push(read_tree(stream));
				continue;
			}
			if (b === '"')
			{
				get(stream);
				t[1].push(read_quoted_string(stream));
				get(stream);
				continue;
			}
			t[1].push(read_string(stream));
		}
		return t;
	}

	function search_tree(t, s)
	{
		if (t[0] === s) return t;
		for (let i = 0; i < t[1].length; i++)
		{
			let st = search_tree(t[1][i], s);
			if (st.length) return st;
		}
		return [];
	}

	function print_tree(t, indent = 0)
	{
		if (t[0].length)
		{
			console.log("  ".repeat(indent) + t[0]);
		}
		t[1].forEach(function(ct)
		{
			print_tree(ct, indent + 1);
		});
	}

	function shape_to_cords(shape, a1, a2)
	{
		let cords = [];
		let rads = (a1 + a2) % (2 * Math.PI);
		let s = Math.sin(rads);
		let c = Math.cos(rads);
		shape.forEach(function(p)
		{
			let px = c * p[0] - s * p[1];
			let py = s * p[0] + c * p[1];
			cords.push([px, py]);
		});
		return cords;
	}

	function terms_equal(t1, t2)
	{
		return equal_3d(t1[2], t2[2]);
	}

	function term_index(terms, term)
	{
		for (let i = 0; i < terms.length; i++)
		{
			if (terms_equal(terms[i], term)) return i;
		}
		return -1;
	}

	let tree = read_tree(stream);
	let structure_root = search_tree(tree, "structure");
	let num_layers = 0;
	let minx = 1000000.0;
	let miny = 1000000.0;
	let maxx = -1000000.0;
	let maxy = -1000000.0;
	structure_root[1].forEach(function (structure_node)
	{
		if (structure_node[0] === "layer") num_layers++;
		if (structure_node[0] === "boundary")
		{
			structure_node[1].forEach(function (boundary_node)
			{
				if (boundary_node[0] === "path")
				{
					for (let cords = 2; cords < boundary_node[1].length; cords += 2)
					{
						let px = parseFloat(boundary_node[1][cords][0]) / 1000.0;
						let py = parseFloat(boundary_node[1][cords+1][0]) / -1000.0;
						minx = Math.min(px, minx);
						maxx = Math.max(px, maxx);
						miny = Math.min(py, miny);
						maxy = Math.max(py, maxy);
					}
				}
			});
		}
	});

	let library_root = search_tree(tree, "library");
	let component_map = new Map();
	let rule_map = new Map();
	library_root[1].forEach(function (library_node)
	{
		if (library_node[0] === "image")
		{
			let component_name = library_node[1][0][0];
			let the_comp = [component_name, new Map()];
			for (let i = 1; i < library_node[1].length; ++i)
			{
				let image_node = library_node[1][i];
				if (image_node[0] === "pin")
				{
					let the_pin = ['', image_node[1][0][0], 0, 0, 0];
					if (image_node[1][1][0] === "rotate")
					{
						the_pin[0] = image_node[1][2][0];
						the_pin[2] = parseFloat(image_node[1][3][0]);
						the_pin[3] = parseFloat(image_node[1][4][0]);
						the_pin[4] = parseFloat(image_node[1][1][1][0][0]) * (Math.PI / 180.0);
					}
					else
					{
						the_pin[0] = image_node[1][1][0];
						the_pin[2] = parseFloat(image_node[1][2][0]);
						the_pin[3] = parseFloat(image_node[1][3][0]);
						the_pin[4] = 0.0;
					}
					the_pin[2] /= 1000.0;
					the_pin[3] /= -1000.0;
					the_comp[1].set(the_pin[0], the_pin);
				}
			}
			component_map.set(component_name, the_comp);
		}
		if (library_node[0] === "padstack")
		{
			for (let i = 1; i < library_node[1].length; ++i)
			{
				let padstack_node = library_node[1][i];
				if (padstack_node[0] === "shape")
				{
					let points = [];
					let the_rule = [0.5, 0.125, []];
					if (padstack_node[1][0][0] === "circle")
					{
						the_rule[0] = parseFloat(padstack_node[1][0][1][1][0]) / 2000.0;
					}
					if (padstack_node[1][0][0] === "path")
					{
						the_rule[0] = parseFloat(padstack_node[1][0][1][1][0]) / 2000.0;
						let x1 = parseFloat(padstack_node[1][0][1][2][0]);
						let y1 = parseFloat(padstack_node[1][0][1][3][0]);
						let x2 = parseFloat(padstack_node[1][0][1][4][0]);
						let y2 = parseFloat(padstack_node[1][0][1][5][0]);
						if (x1 != 0.0
							|| x2 != 0.0
							|| y1 != 0.0
							|| y2 != 0.0)
						{
							x1 /= 1000.0;
							y1 /= -1000.0;
							x2 /= 1000.0;
							y2 /= -1000.0;
							points.push([x1, y1]);
							points.push([x2, y2]);
						}
					}
					if (library_node[1][1][1][0][0] === "rect")
					{
						the_rule[0] = 0.0;
						let x1 = parseFloat(padstack_node[1][0][1][1][0]) / 1000.0;
						let y1 = parseFloat(padstack_node[1][0][1][2][0]) / -1000.0;
						let x2 = parseFloat(padstack_node[1][0][1][3][0]) / 1000.0;
						let y2 = parseFloat(padstack_node[1][0][1][4][0]) / -1000.0;
						points.push([x1, y1]);
						points.push([x2, y1]);
						points.push([x2, y2]);
						points.push([x1, y2]);
						points.push([x1, y1]);
					}
					the_rule[2] = points;
					rule_map.set(library_node[1][0][0], the_rule);
				}
			}
		}
	});

	let placement_root = search_tree(tree, "placement");
	let instance_map = new Map();
	placement_root[1].forEach(function(placement_node)
	{
		if (placement_node[0] === "component")
		{
			let component_name = placement_node[1][0][0];
			for (let i = 1; i < placement_node[1].length; ++i)
			{
				let component_node = placement_node[1][i];
				if (component_node[0] == "place")
				{
					let the_instance = ['', '', '', 0, 0, 0];
					let instance_name = component_node[1][0][0];
					the_instance[0] = instance_name;
					the_instance[1] = component_name;
					the_instance[2] = component_node[1][3][0];
					the_instance[3] = parseFloat(component_node[1][1][0]) / 1000.0;
					the_instance[4] = parseFloat(component_node[1][2][0]) / -1000.0;
					the_instance[5] = parseFloat(component_node[1][4][0]) * -(Math.PI / 180.0);
					instance_map.set(instance_name, the_instance);
				}
			}
		}
	});

	let all_terminals = [];
	instance_map.forEach(function(value, key)
	{
		let component = component_map.get(value[1]);
		component[1].forEach(function(pin)
		{
			let m_x = pin[2];
			let m_y = pin[3];
			if (value[2] !== "front") m_x = -m_x;
			let s = Math.sin(value[5]);
			let c = Math.cos(value[5]);
			let px = (c * m_x - s * m_y) + value[3];
			let py = (s * m_x + c * m_y) + value[4];
			let pin_rule = rule_map.get(pin[1]);
			let tp = [px, py, 0.0];
			let cords = shape_to_cords(pin_rule[2], pin[4], value[5]);
			all_terminals.push([pin_rule[0], pin_rule[1], tp, cords]);
			minx = Math.min(px, minx);
			maxx = Math.max(px, maxx);
			miny = Math.min(py, miny);
			maxy = Math.max(py, maxy);
		});
	});

	let network_root = search_tree(tree, "network");
	let circuit_map = new Map();
	network_root[1].forEach(function(network_node)
	{
		if (network_node[0] === "class")
		{
			let net_rule = [0.125, 0.125, []];
			let the_circuit = ['', []];
			network_node[1].forEach(function(class_node)
			{
				if (class_node[0] === "rule")
				{
					class_node[1].forEach(function(dims)
					{
						if (dims[0] === "width")
						{
							net_rule[0] = parseFloat(dims[1][0][0]) / 2000.0;
						}
						if (dims[0] === "clearance")
						{
							net_rule[1] = parseFloat(dims[1][0][0]) / 2000.0;
						}
					});
				}
				if (class_node[0] === "circuit")
				{
					class_node[1].forEach(function(circuit_node)
					{
						if (circuit_node[0] === "use_via")
						{
							the_circuit[0] = circuit_node[1][0][0];
						}
					});
				}
			});
			the_circuit[1] = net_rule;
			network_node[1].forEach(function(netname)
			{
				if (!netname[1].length) circuit_map.set(netname[0], the_circuit);
			});
		}
	});

	let the_tracks = [];
	network_root[1].forEach(function(network_node)
	{
		if (network_node[0] == "net")
		{
			let the_terminals = [];
			network_node[1][1][1].forEach(function(p)
			{
				let pin_info = p[0].split('-');
				let instance_name = pin_info[0];
				let pin_name = pin_info[1];
				let instance = instance_map.get(instance_name);
				let component = component_map.get(instance[1]);
				let pin = component[1].get(pin_name);
				let m_x = pin[2];
				let m_y = pin[3];
				if (instance[2] !== "front") m_x = -m_x;
				let s = Math.sin(instance[5]);
				let c = Math.cos(instance[5]);
				let px = (c * m_x - s * m_y) + instance[3];
				let py = (s * m_x + c * m_y) + instance[4];
				let pin_rule = rule_map.get(pin[1]);
				let tp = [px, py, 0.0];
				let cords = shape_to_cords(pin_rule[2], pin[4], instance[5]);
				let term = [pin_rule[0], pin_rule[1], tp, cords];
				the_terminals.push(term);
				let index = term_index(all_terminals, term);
				if (index !== -1) all_terminals.splice(index, 1);
			});
			let circuit = circuit_map.get(network_node[1][0][0]);
			let net_rule = circuit[1];
			let via_rule = rule_map.get(circuit[0]);
			the_tracks.push([net_rule[0], via_rule[0], net_rule[1], the_terminals, []]);
		}
	});
	the_tracks.push([0.0, 0.0, 0.0, all_terminals, []]);

	//output pcb format
	the_tracks.forEach(function(track)
	{
		track[3].forEach(function(terminal)
		{
			terminal[2][0] -= (minx - gap);
			terminal[2][1] -= (miny - gap);
		});
	});
	return {dims: [maxx - minx + (gap * 2) + 0.5, maxy - miny + (gap * 2) + 0.5, num_layers],
			tracks: the_tracks};
}
