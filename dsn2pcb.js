// pin = [string m_name, string m_form, float m_x, float m_y, float m_angle]
// component = [string m_name, map<string, pin> m_pin_map]
// rule = [float m_radius, float m_gap, points_2d[] m_shape]
// instance = [string m_name, string m_comp, string m_side, float m_x, float m_y, float m_angle]
// circuit = [string m_via, rule m_rule]

"use strict";

function dsn2pcb(dsn, gap)
{
	var EOF = -1;
	var stream = [dsn, 0];

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
			var input = get(stream);
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
			var b = peek(stream);
			if (b !== '\t' && b !== '\n' && b !== '\r' && b !== ' ') break;
			get(stream);
		}
	}

	function read_node_name(stream)
	{
		var s = "";
		for (;;)
		{
			var b = peek(stream);
			if (b === '\t' || b === '\n' || b === '\r' || b === ' ' || b === ')') break;
			s += get(stream);
		}
		return s;
	}

	function read_string(stream)
	{
		var s = "";
		for (;;)
		{
			var b = peek(stream);
			if (b === '\t' || b === '\n' || b === '\r' || b === ' ' || b === ')') break;
			s += get(stream);
		}
		return [s, []];
	}

	function read_quoted_string(stream)
	{
		var s = "";
		for (;;)
		{
			var b = peek(stream);
			if (b === '"') break;
			s += get(stream);
		}
		return [s, []];
	}

	function read_tree(stream)
	{
		read_until(stream, '(');
		read_whitespace(stream);
		var t = [read_node_name(stream), []];
		for (;;)
		{
			read_whitespace(stream);
			var b = peek(stream);
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
			var st = search_tree(t[1][i], s);
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
		var cords = [];
		var rads = (a1 + a2) % (2 * Math.PI);
		var s = Math.sin(rads);
		var c = Math.cos(rads);
		shape.forEach(function(p)
		{
			var px = c * p[0] - s * p[1];
			var py = s * p[0] + c * p[1];
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

	var tree = read_tree(stream);
	var structure_root = search_tree(tree, "structure");
	var num_layers = 0;
	var minx = 1000000.0;
	var miny = 1000000.0;
	var maxx = -1000000.0;
	var maxy = -1000000.0;
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
						var px = parseFloat(boundary_node[1][cords][0]) / 1000.0;
						var py = parseFloat(boundary_node[1][cords+1][0]) / -1000.0;
						minx = Math.min(px, minx);
						maxx = Math.max(px, maxx);
						miny = Math.min(py, miny);
						maxy = Math.max(py, maxy);
					}
				}
			});
		}
	});

	var library_root = search_tree(tree, "library");
	var component_map = new Map();
	var rule_map = new Map();
	library_root[1].forEach(function (library_node)
	{
		if (library_node[0] === "image")
		{
			var component_name = library_node[1][0][0];
			var the_comp = [component_name, new Map()];
			for (let i = 1; i < library_node[1].length; ++i)
			{
				var image_node = library_node[1][i];
				if (image_node[0] === "pin")
				{
					var the_pin = ['', image_node[1][0][0], 0, 0, 0];
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
				var padstack_node = library_node[1][i];
				if (padstack_node[0] === "shape")
				{
					var points = [];
					var the_rule = [0.5, 0.125, []];
					if (padstack_node[1][0][0] === "circle")
					{
						the_rule[0] = parseFloat(padstack_node[1][0][1][1][0]) / 2000.0;
					}
					if (padstack_node[1][0][0] === "path")
					{
						the_rule[0] = parseFloat(padstack_node[1][0][1][1][0]) / 2000.0;
						var x1 = parseFloat(padstack_node[1][0][1][2][0]);
						var y1 = parseFloat(padstack_node[1][0][1][3][0]);
						var x2 = parseFloat(padstack_node[1][0][1][4][0]);
						var y2 = parseFloat(padstack_node[1][0][1][5][0]);
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
						var x1 = parseFloat(padstack_node[1][0][1][1][0]) / 1000.0;
						var y1 = parseFloat(padstack_node[1][0][1][2][0]) / -1000.0;
						var x2 = parseFloat(padstack_node[1][0][1][3][0]) / 1000.0;
						var y2 = parseFloat(padstack_node[1][0][1][4][0]) / -1000.0;
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

	var placement_root = search_tree(tree, "placement");
	var instance_map = new Map();
	placement_root[1].forEach(function(placement_node)
	{
		if (placement_node[0] === "component")
		{
			var component_name = placement_node[1][0][0];
			for (let i = 1; i < placement_node[1].length; ++i)
			{
				var component_node = placement_node[1][i];
				if (component_node[0] == "place")
				{
					var the_instance = ['', '', '', 0, 0, 0];
					var instance_name = component_node[1][0][0];
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

	var all_terminals = [];
	instance_map.forEach(function(value, key)
	{
		var component = component_map.get(value[1]);
		component[1].forEach(function(pin)
		{
			var m_x = pin[2];
			var m_y = pin[3];
			if (value[2] !== "front") m_x = -m_x;
			var s = Math.sin(value[5]);
			var c = Math.cos(value[5]);
			var px = (c * m_x - s * m_y) + value[3];
			var py = (s * m_x + c * m_y) + value[4];
			var pin_rule = rule_map.get(pin[1]);
			var tp = [px, py, 0.0];
			var cords = shape_to_cords(pin_rule[2], pin[4], value[5]);
			all_terminals.push([pin_rule[0], pin_rule[1], tp, cords]);
			minx = Math.min(px, minx);
			maxx = Math.max(px, maxx);
			miny = Math.min(py, miny);
			maxy = Math.max(py, maxy);
		});
	});

	var network_root = search_tree(tree, "network");
	var circuit_map = new Map();
	network_root[1].forEach(function(network_node)
	{
		if (network_node[0] === "class")
		{
			var net_rule = [0.125, 0.125, []];
			var the_circuit = ['', []];
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

	var the_tracks = [];
	network_root[1].forEach(function(network_node)
	{
		if (network_node[0] == "net")
		{
			var the_terminals = [];
			network_node[1][1][1].forEach(function(p)
			{
				var pin_info = p[0].split('-');
				var instance_name = pin_info[0];
				var pin_name = pin_info[1];
				var instance = instance_map.get(instance_name);
				var component = component_map.get(instance[1]);
				var pin = component[1].get(pin_name);
				var m_x = pin[2];
				var m_y = pin[3];
				if (instance[2] !== "front") m_x = -m_x;
				var s = Math.sin(instance[5]);
				var c = Math.cos(instance[5]);
				var px = (c * m_x - s * m_y) + instance[3];
				var py = (s * m_x + c * m_y) + instance[4];
				var pin_rule = rule_map.get(pin[1]);
				var tp = [px, py, 0.0];
				var cords = shape_to_cords(pin_rule[2], pin[4], instance[5]);
				var term = [pin_rule[0], pin_rule[1], tp, cords];
				the_terminals.push(term);
				var index = term_index(all_terminals, term);
				if (index !== -1) all_terminals.splice(index, 1);
			});
			var circuit = circuit_map.get(network_node[1][0][0]);
			var net_rule = circuit[1];
			var via_rule = rule_map.get(circuit[0]);
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
